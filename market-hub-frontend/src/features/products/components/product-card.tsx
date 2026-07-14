"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import type { Product } from "@/types/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/store/cart-store";
import { useWishlistStore } from "@/store/wishlist-store";
import { cn, formatCurrency, productImageUrl } from "@/lib/utils";

export function ProductCard({
  product,
  highlighted = false,
}: {
  product: Product;
  highlighted?: boolean;
}) {
  const addItem = useCartStore((s) => s.addItem);
  const toggle = useWishlistStore((s) => s.toggle);
  const wished = useWishlistStore((s) => s.has(product.id));
  const img = productImageUrl(product);
  const price = Number(product.price);
  const compare = price * 1.25;
  const save = compare - price;

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
        highlighted && "border-blue-500 shadow-blue-100",
      )}
    >
      <button
        className="absolute right-3 top-3 z-10 rounded-full bg-white/90 p-2 shadow-sm"
        onClick={() => {
          toggle(product);
          toast.success(wished ? "Removed from wishlist" : "Added to wishlist");
        }}
        aria-label="Toggle wishlist"
      >
        <Heart
          className={cn("h-4 w-4", wished ? "fill-rose-500 text-rose-500" : "text-slate-500")}
        />
      </button>
      <Badge className="absolute left-3 top-3 z-10 rounded-md">20% OFF</Badge>

      <Link href={`/products/${product.id}`} className="relative block aspect-square bg-slate-50">
        {img ? (
          <Image
            src={img}
            alt={product.name}
            fill
            className="object-cover transition group-hover:scale-[1.03]"
            sizes="(max-width:768px) 50vw, 20vw"
            unoptimized
          />
        ) : (
          <div className="grid h-full place-items-center text-sm text-slate-400">
            {product.name.slice(0, 1)}
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <Link href={`/products/${product.id}`} className="line-clamp-2 text-sm font-semibold text-slate-900 hover:text-blue-600">
          {product.name}
        </Link>
        <div className="flex items-baseline gap-2">
          <span className="text-base font-bold">{formatCurrency(price)}</span>
          <span className="text-xs text-slate-400 line-through">
            {formatCurrency(compare)}
          </span>
        </div>
        <p className="text-xs font-semibold text-emerald-600">
          Save - {formatCurrency(save)}
        </p>
        <Button
          className="mt-auto w-full"
          size="sm"
          disabled={!product.in_stock}
          onClick={() => {
            addItem(product);
            toast.success("Added to cart");
          }}
        >
          <ShoppingCart className="h-4 w-4" />
          {product.in_stock ? "Add to cart" : "Out of stock"}
        </Button>
      </div>
    </article>
  );
}
