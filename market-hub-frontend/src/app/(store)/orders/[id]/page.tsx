"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Circle } from "lucide-react";
import { toast } from "sonner";
import { ordersApi } from "@/services/api";
import { useAuthStore } from "@/store/auth-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { getErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";

const STEPS = ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"] as const;

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const search = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  const order = useQuery({
    queryKey: ["order", id],
    queryFn: () => ordersApi.get(id),
    enabled: !!user,
  });

  const cancel = useMutation({
    mutationFn: () => ordersApi.setStatus(Number(id), "CANCELLED"),
    onSuccess: () => {
      toast.success("Order cancelled");
      qc.invalidateQueries({ queryKey: ["order", id] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  if (!user) {
    return (
      <div className="container-mh py-16 text-center">
        <Link href="/auth/login">
          <Button>Sign in</Button>
        </Link>
      </div>
    );
  }

  if (order.isLoading) {
    return (
      <div className="container-mh py-8">
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!order.data) {
    return (
      <div className="container-mh py-16 text-center text-slate-500">
        Order not found.
      </div>
    );
  }

  const o = order.data;
  const stepIndex =
    o.status === "CANCELLED"
      ? -1
      : o.status === "PENDING"
        ? -0.5
        : STEPS.indexOf(o.status as (typeof STEPS)[number]);

  return (
    <div className="container-mh py-8">
      {search.get("paid") && (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Payment confirmed. Your order is now paid.
        </div>
      )}
      {search.get("success") && !o.is_paid && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Order is reserved but <strong>not paid yet</strong>.{" "}
          <Link href={`/checkout/pay/${o.id}`} className="underline">
            Complete payment
          </Link>{" "}
          to confirm it.
        </div>
      )}
      {!o.is_paid && o.status === "PENDING" && !search.get("success") && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Awaiting payment.{" "}
          <Link href={`/checkout/pay/${o.id}`} className="font-semibold underline">
            Pay now
          </Link>
        </div>
      )}

      <div className="mb-2 text-sm text-slate-500">
        <Link href="/">Home</Link> · <Link href="/orders">Orders</Link> · ID {o.id}
      </div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-outfit)] text-3xl font-bold">
            Order ID: {o.id}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Order date: {new Date(o.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary">{o.status}</Badge>
          {o.is_paid && <Badge variant="success">Paid</Badge>}
          {user.role === "CUSTOMER" && o.status === "PENDING" && (
            <Button
              variant="outline"
              size="sm"
              disabled={cancel.isPending}
              onClick={() => cancel.mutate()}
            >
              Cancel order
            </Button>
          )}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 rounded-2xl border border-slate-200 bg-white p-6 md:grid-cols-4">
        {STEPS.map((step, i) => {
          const done = stepIndex >= i;
          return (
            <div key={step} className="flex items-start gap-2">
              {done ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-500" />
              ) : (
                <Circle className="mt-0.5 h-5 w-5 text-slate-300" />
              )}
              <div>
                <p
                  className={cn(
                    "text-sm font-semibold",
                    done ? "text-emerald-700" : "text-slate-400",
                  )}
                >
                  {step.replace("_", " ")}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">Items</h2>
          {o.items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between border-b border-slate-100 py-3 text-sm"
            >
              <div>
                <p className="font-medium">{item.product_name}</p>
                <p className="text-slate-500">Qty {item.quantity}</p>
              </div>
              <p className="font-semibold">{formatCurrency(item.subtotal)}</p>
            </div>
          ))}
        </div>
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">Order summary</h2>
          <div className="mt-4 flex justify-between text-sm">
            <span>Total</span>
            <span className="text-lg font-bold">{formatCurrency(o.total_price)}</span>
          </div>
          <div className="mt-4 text-sm text-slate-500">
            Customer: {o.customer_username}
          </div>
        </aside>
      </div>
    </div>
  );
}
