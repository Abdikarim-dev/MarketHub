"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";
import { categoriesApi, productsApi, inventoryApi } from "@/services/api";
import { productSchema, type ProductValues } from "@/schemas/auth";
import { getErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { useState } from "react";

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);
  const [stockInQty, setStockInQty] = useState(1);

  useEffect(() => {
    if (hydrated && (!user || (user.role !== "SELLER" && user.role !== "ADMIN"))) {
      router.replace("/auth/login");
    }
  }, [hydrated, user, router]);

  const product = useQuery({
    queryKey: ["product", id],
    queryFn: () => productsApi.get(id),
  });
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoriesApi.list({ page_size: 100 }),
  });

  const form = useForm<ProductValues>({
    resolver: zodResolver(productSchema),
    values: product.data
      ? {
          name: product.data.name,
          description: product.data.description,
          category: product.data.category,
          price: Number(product.data.price),
          stock: product.data.stock,
          is_active: product.data.is_active,
        }
      : undefined,
  });

  const update = useMutation({
    mutationFn: (values: ProductValues) =>
      productsApi.update(Number(id), {
        name: values.name,
        description: values.description,
        category: values.category,
        price: values.price,
        is_active: values.is_active,
      }),
    onSuccess: () => toast.success("Product updated"),
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const stockIn = useMutation({
    mutationFn: () =>
      inventoryApi.create({
        product: Number(id),
        transaction_type: "STOCK_IN",
        quantity: stockInQty,
      }),
    onSuccess: () => {
      toast.success("Stock increased");
      product.refetch();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <div className="container-mh max-w-2xl space-y-6 py-8">
      <Link href="/seller/products" className="text-sm text-blue-600">
        ← Products
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Edit product</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit((values) => update.mutate(values))}
          >
            <div className="space-y-2">
              <Label>Name</Label>
              <Input {...form.register("name")} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input {...form.register("description")} />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <select
                className="flex h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
                {...form.register("category", { valueAsNumber: true })}
              >
                {categories.data?.results.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Price</Label>
              <Input type="number" step="0.01" {...form.register("price", { valueAsNumber: true })} />
            </div>
            <p className="text-sm text-slate-500">
              Current stock: {product.data?.stock ?? "—"} (adjust via inventory)
            </p>
            <Button type="submit" disabled={update.isPending}>
              Save changes
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stock in</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Input
            type="number"
            min={1}
            value={stockInQty}
            onChange={(e) => setStockInQty(Number(e.target.value))}
            className="w-32"
          />
          <Button
            onClick={() => stockIn.mutate()}
            disabled={stockIn.isPending}
          >
            Add stock
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
