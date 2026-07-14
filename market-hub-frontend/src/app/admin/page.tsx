"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuthStore } from "@/store/auth-store";
import { categoriesApi, ordersApi, productsApi, paymentsApi } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { getErrorMessage } from "@/lib/api";
import { useState } from "react";

export default function AdminDashboardPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);
  const qc = useQueryClient();
  const [categoryName, setCategoryName] = useState("");

  useEffect(() => {
    if (hydrated && (!user || user.role !== "ADMIN")) {
      router.replace("/auth/login");
    }
  }, [hydrated, user, router]);

  const products = useQuery({
    queryKey: ["admin-products"],
    queryFn: () => productsApi.list({ page_size: 20 }),
    enabled: user?.role === "ADMIN",
  });
  const orders = useQuery({
    queryKey: ["admin-orders"],
    queryFn: () => ordersApi.list({ page_size: 20 }),
    enabled: user?.role === "ADMIN",
  });
  const categories = useQuery({
    queryKey: ["admin-categories"],
    queryFn: () => categoriesApi.list({ page_size: 50 }),
    enabled: user?.role === "ADMIN",
  });
  const payments = useQuery({
    queryKey: ["admin-payments"],
    queryFn: () => paymentsApi.list(),
    enabled: user?.role === "ADMIN",
  });

  const createCategory = useMutation({
    mutationFn: () => categoriesApi.create({ name: categoryName }),
    onSuccess: () => {
      toast.success("Category created");
      setCategoryName("");
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      ordersApi.setStatus(id, status),
    onSuccess: () => {
      toast.success("Order updated");
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const chart =
    orders.data?.results.slice(0, 8).map((o) => ({
      name: `#${o.id}`,
      total: Number(o.total_price),
    })) ?? [];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="container-mh flex items-center justify-between py-4">
          <div>
            <p className="text-sm font-semibold text-blue-600">MarketHub Admin</p>
            <h1 className="text-2xl font-bold">Platform overview</h1>
          </div>
          <Link href="/">
            <Button variant="outline">Storefront</Button>
          </Link>
        </div>
      </div>

      <div className="container-mh space-y-6 py-8">
        <div className="grid gap-4 md:grid-cols-4">
          {[
            ["Products", products.data?.count ?? 0],
            ["Orders", orders.data?.count ?? 0],
            ["Categories", categories.data?.count ?? 0],
            ["Payments", payments.data?.count ?? 0],
          ].map(([label, value]) => (
            <Card key={String(label)}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-500">{label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent order totals</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="total" fill="#0b72e7" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Create category</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Input
                placeholder="Category name"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
              />
              <Button
                disabled={!categoryName || createCategory.isPending}
                onClick={() => createCategory.mutate()}
              >
                Add
              </Button>
            </CardContent>
            <CardContent className="flex flex-wrap gap-2 pt-0">
              {(categories.data?.results ?? []).map((c) => (
                <Badge key={c.id} variant="secondary">
                  {c.name}
                </Badge>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Orders monitoring</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(orders.data?.results ?? []).map((o) => (
              <div
                key={o.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-3 text-sm"
              >
                <div>
                  <p className="font-semibold">
                    Order #{o.id} · {o.customer_username}
                  </p>
                  <p className="text-slate-500">
                    {formatCurrency(o.total_price)} · {o.status}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"].map(
                    (status) => (
                      <Button
                        key={status}
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          updateStatus.mutate({ id: o.id, status })
                        }
                      >
                        {status}
                      </Button>
                    ),
                  )}
                  <Link href={`/orders/${o.id}`}>
                    <Button size="sm">View</Button>
                  </Link>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
