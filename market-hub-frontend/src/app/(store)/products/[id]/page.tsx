"use client";

import Image from "next/image";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { productsApi, reviewsApi } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useCartStore } from "@/store/cart-store";
import { useAuthStore } from "@/store/auth-store";
import { formatCurrency, productImageUrl } from "@/lib/utils";
import { getErrorMessage } from "@/lib/api";
import { ProductCard } from "@/features/products/components/product-card";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const addItem = useCartStore((s) => s.addItem);
  const user = useAuthStore((s) => s.user);
  const [qty, setQty] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const qc = useQueryClient();

  const product = useQuery({
    queryKey: ["product", id],
    queryFn: () => productsApi.get(id),
  });

  const reviews = useQuery({
    queryKey: ["reviews", id],
    queryFn: () => reviewsApi.list({ product: id }),
  });

  const related = useQuery({
    queryKey: ["related", product.data?.category],
    queryFn: () =>
      productsApi.list({
        category: product.data?.category,
        page_size: 4,
      }),
    enabled: !!product.data?.category,
  });

  const reviewMutation = useMutation({
    mutationFn: () =>
      reviewsApi.create({
        product: Number(id),
        rating,
        comment,
      }),
    onSuccess: () => {
      toast.success("Review submitted");
      setComment("");
      qc.invalidateQueries({ queryKey: ["reviews", id] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  if (product.isLoading) {
    return (
      <div className="container-mh grid gap-8 py-10 lg:grid-cols-2">
        <Skeleton className="aspect-square" />
        <Skeleton className="h-80" />
      </div>
    );
  }

  if (product.isError || !product.data) {
    return (
      <div className="container-mh py-16 text-center text-slate-500">
        Product not found.
      </div>
    );
  }

  const p = product.data;
  const gallery =
    p.images?.length
      ? p.images.map((img) => img.url)
      : [productImageUrl(p)].filter(Boolean) as string[];
  const img = gallery[activeImage] ?? gallery[0] ?? null;

  return (
    <div className="container-mh py-8">
      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <div className="relative aspect-square overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
            {img ? (
              <Image
                src={img}
                alt={p.name}
                fill
                className="object-cover"
                sizes="(max-width:1024px) 100vw, 50vw"
                unoptimized
              />
            ) : (
              <div className="grid h-full place-items-center text-slate-400">
                No image
              </div>
            )}
          </div>
          {gallery.length > 1 && (
            <div className="mt-3 grid grid-cols-3 gap-3">
              {gallery.map((url, i) => (
                <button
                  key={`${url}-${i}`}
                  type="button"
                  onClick={() => setActiveImage(i)}
                  className={`relative aspect-square overflow-hidden rounded-2xl border-2 ${
                    activeImage === i ? "border-blue-600" : "border-slate-200"
                  }`}
                >
                  <Image
                    src={url}
                    alt={`${p.name} ${i + 1}`}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          <Badge variant="secondary">{p.category_name}</Badge>
          <h1 className="mt-3 font-[family-name:var(--font-outfit)] text-3xl font-bold tracking-tight">
            {p.name}
          </h1>
          <p className="mt-2 text-sm text-slate-500">Sold by {p.seller_username}</p>
          <p className="mt-4 text-3xl font-extrabold text-blue-600">
            {formatCurrency(p.price)}
          </p>
          <p className="mt-4 text-sm leading-relaxed text-slate-600">
            {p.description || "No description provided."}
          </p>
          <p className="mt-3 text-sm">
            Stock:{" "}
            <span className={p.in_stock ? "text-emerald-600" : "text-rose-600"}>
              {p.in_stock ? `${p.stock} available` : "Out of stock"}
            </span>
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Input
              type="number"
              min={1}
              max={p.stock}
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
              className="w-24"
            />
            <Button
              disabled={!p.in_stock}
              onClick={() => {
                addItem(p, qty);
                toast.success("Added to cart");
              }}
            >
              Add to cart
            </Button>
          </div>
        </div>
      </div>

      <section className="mt-12">
        <h2 className="section-title mb-4">
          Customer <span>Reviews</span>
        </h2>
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-3">
            {reviews.data?.results.length ? (
              reviews.data.results.map((r) => (
                <div
                  key={r.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{r.user_username}</p>
                    <p className="text-sm text-amber-500">{"★".repeat(r.rating)}</p>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{r.comment || "—"}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No reviews yet.</p>
            )}
          </div>
          {user?.role === "CUSTOMER" && (
            <form
              className="h-fit space-y-3 rounded-2xl border border-slate-200 bg-white p-4"
              onSubmit={(e) => {
                e.preventDefault();
                reviewMutation.mutate();
              }}
            >
              <p className="font-semibold">Leave a review</p>
              <select
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
              >
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n} stars
                  </option>
                ))}
              </select>
              <Input
                placeholder="Your comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <Button className="w-full" disabled={reviewMutation.isPending}>
                Submit review
              </Button>
            </form>
          )}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="section-title mb-4">
          Related <span>Products</span>
        </h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {related.data?.results
            .filter((item) => item.id !== p.id)
            .slice(0, 4)
            .map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
        </div>
      </section>
    </div>
  );
}
