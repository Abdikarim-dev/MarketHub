"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ordersApi } from "@/services/api";
import { useAuthStore } from "@/store/auth-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";

const statusVariant: Record<string, "secondary" | "success" | "warning" | "danger" | "default"> = {
  PENDING: "warning",
  CONFIRMED: "default",
  PROCESSING: "secondary",
  SHIPPED: "default",
  DELIVERED: "success",
  CANCELLED: "danger",
};

export default function OrdersPage() {
  const user = useAuthStore((s) => s.user);
  const orders = useQuery({
    queryKey: ["orders"],
    queryFn: () => ordersApi.list(),
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="container-mh py-16 text-center">
        <p className="text-slate-600">Sign in to view your orders.</p>
        <Link href="/auth/login">
          <Button className="mt-4">Sign in</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container-mh py-8">
      <h1 className="section-title mb-6">
        Order <span>History</span>
      </h1>
      {orders.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : orders.data?.results.length ? (
        <div className="space-y-3">
          {orders.data.results.map((order) => (
            <Link
              key={order.id}
              href={`/orders/${order.id}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-blue-300"
            >
              <div>
                <p className="font-semibold">Order #{order.id}</p>
                <p className="text-xs text-slate-500">
                  {new Date(order.created_at).toLocaleString()} ·{" "}
                  {order.items.length} item(s)
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={statusVariant[order.status] ?? "secondary"}>
                  {order.status}
                </Badge>
                <span className="font-bold">{formatCurrency(order.total_price)}</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500">
          No orders yet.
        </p>
      )}
    </div>
  );
}
