"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/store/cart-store";
import { formatCurrency, productImageUrl } from "@/lib/utils";

export function CartDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const items = useCartStore((s) => s.items);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const subtotal = useCartStore((s) => s.subtotal());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="right-4 top-4 left-auto max-h-[90vh] w-[min(100%-2rem,26rem)] translate-x-0 translate-y-0 overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle>Shopping cart</DialogTitle>
        </DialogHeader>

        {items.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-500">
            Your cart is empty.
          </div>
        ) : (
          <div className="space-y-4">
            {items.map(({ product, quantity }) => {
              const img = productImageUrl(product);
              return (
                <div
                  key={product.id}
                  className="flex gap-3 border-b border-slate-100 pb-4"
                >
                  <div className="relative h-16 w-16 overflow-hidden rounded-xl bg-slate-100">
                    {img ? (
                      <Image
                        src={img}
                        alt={product.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="grid h-full place-items-center text-xs text-slate-400">
                        No image
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="line-clamp-1 text-sm font-semibold">
                      {product.name}
                    </p>
                    <p className="text-sm text-blue-600">
                      {formatCurrency(product.price)}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-7 w-7"
                        onClick={() => setQuantity(product.id, quantity - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center text-sm">{quantity}</span>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-7 w-7"
                        onClick={() => setQuantity(product.id, quantity + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="ml-auto h-7 w-7 text-rose-500"
                        onClick={() => removeItem(product.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="flex items-center justify-between pt-2 text-sm">
              <span className="text-slate-500">Subtotal</span>
              <span className="text-lg font-bold">{formatCurrency(subtotal)}</span>
            </div>
            <Link href="/checkout" onClick={() => onOpenChange(false)}>
              <Button className="w-full">Checkout</Button>
            </Link>
            <Link href="/cart" onClick={() => onOpenChange(false)}>
              <Button variant="outline" className="mt-2 w-full">
                View cart
              </Button>
            </Link>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
