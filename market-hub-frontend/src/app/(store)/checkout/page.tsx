"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ordersApi, paymentsApi } from "@/services/api";
import { useCartStore } from "@/store/cart-store";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { getErrorMessage } from "@/lib/api";
import Link from "next/link";

export default function CheckoutPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.subtotal());
  const clear = useCartStore((s) => s.clear);

  const checkout = useMutation({
    mutationFn: async () => {
      const order = await ordersApi.create(
        items.map((i) => ({ product: i.product.id, quantity: i.quantity })),
      );
      try {
        await paymentsApi.createIntent(order.id);
      } catch {
        // Payment intent is optional if Stripe isn't configured
      }
      return order;
    },
    onSuccess: (order) => {
      clear();
      toast.success("Order placed successfully");
      router.push(`/orders/${order.id}?success=1`);
    },
    onError: (e) => toast.error(getErrorMessage(e, "Checkout failed")),
  });

  if (!user) {
    return (
      <div className="container-mh py-16 text-center">
        <p className="text-slate-600">Please sign in to checkout.</p>
        <Link href="/auth/login">
          <Button className="mt-4">Sign in</Button>
        </Link>
      </div>
    );
  }

  if (user.role !== "CUSTOMER") {
    return (
      <div className="container-mh py-16 text-center text-slate-600">
        Only customer accounts can place orders.
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="container-mh py-16 text-center">
        <p className="text-slate-600">Your cart is empty.</p>
        <Link href="/products">
          <Button className="mt-4">Browse products</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container-mh grid gap-6 py-8 lg:grid-cols-[1fr_340px]">
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h1 className="section-title">
          Checkout <span>Summary</span>
        </h1>
        <ul className="mt-6 space-y-3">
          {items.map(({ product, quantity }) => (
            <li
              key={product.id}
              className="flex items-center justify-between border-b border-slate-100 pb-3 text-sm"
            >
              <span>
                {product.name} × {quantity}
              </span>
              <span className="font-semibold">
                {formatCurrency(Number(product.price) * quantity)}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex justify-between text-sm">
          <span>Total</span>
          <span className="text-xl font-bold">{formatCurrency(subtotal)}</span>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Stock is reserved when the order is created. Payment confirmation is
          handled by Stripe webhooks on the backend.
        </p>
        <Button
          className="mt-5 w-full"
          disabled={checkout.isPending}
          onClick={() => checkout.mutate()}
        >
          {checkout.isPending ? "Placing order..." : "Place order"}
        </Button>
      </aside>
    </div>
  );
}
