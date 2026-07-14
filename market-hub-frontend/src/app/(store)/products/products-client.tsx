"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { productsApi, categoriesApi } from "@/services/api";
import { ProductCard } from "@/features/products/components/product-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

export default function ProductsPage() {
  const params = useSearchParams();
  const search = params.get("search") ?? "";
  const category = params.get("category") ?? "";
  const ordering = params.get("ordering") ?? "-created_at";
  const page = Number(params.get("page") ?? "1");

  const queryKey = useMemo(
    () => ["products", { search, category, ordering, page }],
    [search, category, ordering, page],
  );

  const products = useQuery({
    queryKey,
    queryFn: () =>
      productsApi.list({
        search: search || undefined,
        category: category || undefined,
        ordering,
        page,
        page_size: 12,
      }),
  });

  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoriesApi.list({ page_size: 50 }),
  });

  const totalPages = Math.max(1, Math.ceil((products.data?.count ?? 0) / 12));

  return (
    <div className="container-mh py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="section-title">
            All <span>Products</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {products.data?.count ?? 0} results
            {search ? ` for “${search}”` : ""}
          </p>
        </div>
        <form className="flex gap-2" action="/products">
          <Input
            name="search"
            defaultValue={search}
            placeholder="Search products..."
            className="w-56"
          />
          <Button type="submit">Search</Button>
        </form>
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-4">
          <p className="mb-3 text-sm font-semibold">Categories</p>
          <div className="space-y-1">
            <Link
              href={`/products?search=${encodeURIComponent(search)}&ordering=${ordering}`}
              className={`block rounded-lg px-3 py-2 text-sm ${
                !category ? "bg-blue-50 text-blue-700" : "hover:bg-slate-50"
              }`}
            >
              All
            </Link>
            {categories.data?.results.map((c) => (
              <Link
                key={c.id}
                href={`/products?category=${c.slug || c.id}&search=${encodeURIComponent(search)}&ordering=${ordering}`}
                className={`block rounded-lg px-3 py-2 text-sm ${
                  category === c.slug || category === String(c.id)
                    ? "bg-blue-50 text-blue-700"
                    : "hover:bg-slate-50"
                }`}
              >
                {c.name}
              </Link>
            ))}
          </div>
          <p className="mb-2 mt-5 text-sm font-semibold">Sort</p>
          <div className="space-y-1 text-sm">
            {[
              ["-created_at", "Newest"],
              ["price", "Price: low to high"],
              ["-price", "Price: high to low"],
              ["name", "Name"],
            ].map(([value, label]) => (
              <Link
                key={value}
                href={`/products?ordering=${value}&search=${encodeURIComponent(search)}&category=${category}`}
                className={`block rounded-lg px-3 py-2 ${
                  ordering === value ? "bg-blue-50 text-blue-700" : "hover:bg-slate-50"
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        </aside>

        <div>
          {products.isLoading ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-72" />
              ))}
            </div>
          ) : products.data?.results.length ? (
            <>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                {products.data.results.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
              <div className="mt-8 flex items-center justify-center gap-2">
                <Link
                  href={`/products?page=${Math.max(1, page - 1)}&search=${encodeURIComponent(search)}&category=${category}&ordering=${ordering}`}
                >
                  <Button variant="outline" disabled={page <= 1}>
                    Previous
                  </Button>
                </Link>
                <span className="text-sm text-slate-500">
                  Page {page} of {totalPages}
                </span>
                <Link
                  href={`/products?page=${Math.min(totalPages, page + 1)}&search=${encodeURIComponent(search)}&category=${category}&ordering=${ordering}`}
                >
                  <Button variant="outline" disabled={page >= totalPages}>
                    Next
                  </Button>
                </Link>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
              No products found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
