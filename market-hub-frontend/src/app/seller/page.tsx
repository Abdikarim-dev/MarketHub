"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Package, ShoppingBag, Warehouse } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { inventoryApi, ordersApi, productsApi } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

export default function SellerDashboardPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);

  useEffect(() => {
    if (hydrated && (!user || (user.role !== "SELLER" && user.role !== "ADMIN"))) {
      router.replace("/auth/login");
    }
  }, [hydrated, user, router]);

  const products = useQuery({
    queryKey: ["seller-products"],
    queryFn: () => productsApi.list({ mine: true, page_size: 50 }),
    enabled: !!user && (user.role === "SELLER" || user.role === "ADMIN"),
  });
  const orders = useQuery({
    queryKey: ["seller-orders"],
    queryFn: () => ordersApi.list({ page_size: 20 }),
    enabled: !!user && (user.role === "SELLER" || user.role === "ADMIN"),
  });
  const inventory = useQuery({
    queryKey: ["seller-inventory"],
    queryFn: () => inventoryApi.list({ page_size: 10 }),
    enabled: !!user && (user.role === "SELLER" || user.role === "ADMIN"),
  });

  const productCount = products.data?.count ?? 0;
  const orderCount = orders.data?.count ?? 0;
  const revenue =
    orders.data?.results.reduce((sum, o) => sum + Number(o.total_price), 0) ?? 0;

  const chartData =
    products.data?.results.slice(0, 6).map((p) => ({
      name: p.name.slice(0, 10),
      stock: p.stock,
    })) ?? [];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="container-mh flex items-center justify-between py-4">
          <div>
            <p className="text-sm font-semibold text-blue-600">MarketHub Seller</p>
            <h1 className="text-2xl font-bold">Dashboard</h1>
          </div>
          <div className="flex gap-2">
            <Link href="/">
              <Button variant="outline">Storefront</Button>
            </Link>
            <Link href="/seller/products">
              <Button>Manage products</Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="container-mh space-y-6 py-8">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">
                Products
              </CardTitle>
              <Package className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{productCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">
                Related orders
              </CardTitle>
              <ShoppingBag className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{orderCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">
                Order volume
              </CardTitle>
              <Warehouse className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{formatCurrency(revenue)}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Stock snapshot</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="stock" fill="#0b72e7" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent inventory</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(inventory.data?.results ?? []).slice(0, 6).map((t) => (
                <div key={t.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">{t.product_name}</p>
                    <p className="text-xs text-slate-500">{t.created_at.slice(0, 10)}</p>
                  </div>
                  <Badge variant="secondary">
                    {t.transaction_type} ×{t.quantity}
                  </Badge>
                </div>
              ))}
              {!inventory.data?.results?.length && (
                <p className="text-sm text-slate-500">No inventory activity yet.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Your products</CardTitle>
            <Link href="/seller/products/new">
              <Button size="sm">Add product</Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {(products.data?.results ?? []).map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 px-3 py-3 text-sm"
              >
                <div>
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-slate-500">
                    {formatCurrency(p.price)} · stock {p.stock}
                  </p>
                </div>
                <Link href={`/seller/products/${p.id}`}>
                  <Button size="sm" variant="outline">
                    Edit
                  </Button>
                </Link>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
