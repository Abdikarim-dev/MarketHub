"use client";

import Link from "next/link";
import { ProductCard } from "@/features/products/components/product-card";
import { useWishlistStore } from "@/store/wishlist-store";
import { Button } from "@/components/ui/button";

export default function WishlistPage() {
  const items = useWishlistStore((s) => s.items);

  return (
    <div className="container-mh py-8">
      <h1 className="section-title mb-6">
        Your <span>Wishlist</span>
      </h1>
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center">
          <p className="text-slate-500">No saved products yet.</p>
          <Link href="/products">
            <Button className="mt-4">Browse products</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
