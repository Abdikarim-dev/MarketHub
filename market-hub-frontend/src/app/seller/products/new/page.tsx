"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";
import { categoriesApi, productsApi } from "@/services/api";
import { productSchema, type ProductValues } from "@/schemas/auth";
import { getErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function NewProductPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);

  useEffect(() => {
    if (hydrated && (!user || (user.role !== "SELLER" && user.role !== "ADMIN"))) {
      router.replace("/auth/login");
    }
  }, [hydrated, user, router]);

  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoriesApi.list({ page_size: 100 }),
  });

  const form = useForm<ProductValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      category: 0,
      price: 0,
      stock: 0,
      is_active: true,
    },
  });

  const create = useMutation({
    mutationFn: (values: ProductValues) =>
      productsApi.create({
        ...values,
        is_active: true,
      }),
    onSuccess: () => {
      toast.success("Product created");
      router.push("/seller/products");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <div className="container-mh max-w-2xl py-8">
      <Link href="/seller/products" className="text-sm text-blue-600">
        ← Products
      </Link>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Create product</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit((values) => create.mutate(values))}
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
                <option value={0}>Select category</option>
                {categories.data?.results.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Price</Label>
                <Input type="number" step="0.01" {...form.register("price", { valueAsNumber: true })} />
              </div>
              <div className="space-y-2">
                <Label>Stock</Label>
                <Input type="number" {...form.register("stock", { valueAsNumber: true })} />
              </div>
            </div>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Saving..." : "Create product"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
