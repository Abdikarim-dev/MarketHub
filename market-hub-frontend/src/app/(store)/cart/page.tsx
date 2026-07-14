"use client";

import Image from "next/image";
import Link from "next/link";
import { useCartStore } from "@/store/cart-store";
import { Button } from "@/components/ui/button";
import { formatCurrency, productImageUrl } from "@/lib/utils";

export default function CartPage() {
  const items = useCartStore((s) => s.items);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const subtotal = useCartStore((s) => s.subtotal());

  return (
    <div className="container-mh py-8">
      <h1 className="section-title mb-6">
        Shopping <span>Cart</span>
      </h1>
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <p className="text-slate-500">Your cart is empty.</p>
          <Link href="/products">
            <Button className="mt-4">Browse products</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            {items.map(({ product, quantity }) => {
              const img = productImageUrl(product);
              return (
                <div
                  key={product.id}
                  className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4"
                >
                  <div className="relative h-24 w-24 overflow-hidden rounded-xl bg-slate-50">
                    {img && (
                      <Image src={img} alt={product.name} fill className="object-contain p-2" />
                    )}
                  </div>
                  <div className="flex-1">
                    <Link
                      href={`/products/${product.id}`}
                      className="font-semibold hover:text-blue-600"
                    >
                      {product.name}
                    </Link>
                    <p className="text-sm text-blue-600">
                      {formatCurrency(product.price)}
                    </p>
                    <div className="mt-3 flex items-center gap-3">
                      <input
                        type="number"
                        min={1}
                        max={product.stock}
                        value={quantity}
                        onChange={(e) =>
                          setQuantity(product.id, Number(e.target.value))
                        }
                        className="h-9 w-20 rounded-lg border border-slate-200 px-2 text-sm"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-rose-600"
                        onClick={() => removeItem(product.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                  <p className="font-semibold">
                    {formatCurrency(Number(product.price) * quantity)}
                  </p>
                </div>
              );
            })}
          </div>
          <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold">Order summary</h2>
            <div className="mt-4 flex justify-between text-sm">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-bold">{formatCurrency(subtotal)}</span>
            </div>
            <Link href="/checkout">
              <Button className="mt-5 w-full">Proceed to checkout</Button>
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}
