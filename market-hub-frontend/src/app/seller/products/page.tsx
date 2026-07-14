"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";
import { productsApi } from "@/services/api";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { getErrorMessage } from "@/lib/api";

export default function SellerProductsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);
  const qc = useQueryClient();

  useEffect(() => {
    if (hydrated && (!user || (user.role !== "SELLER" && user.role !== "ADMIN"))) {
      router.replace("/auth/login");
    }
  }, [hydrated, user, router]);

  const products = useQuery({
    queryKey: ["seller-products"],
    queryFn: () => productsApi.list({ mine: true, page_size: 100 }),
    enabled: !!user,
  });

  const remove = useMutation({
    mutationFn: (id: number) => productsApi.remove(id),
    onSuccess: () => {
      toast.success("Product deleted");
      qc.invalidateQueries({ queryKey: ["seller-products"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <div className="container-mh py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/seller" className="text-sm text-blue-600">
            ← Dashboard
          </Link>
          <h1 className="mt-1 text-2xl font-bold">Products</h1>
        </div>
        <Link href="/seller/products/new">
          <Button>New product</Button>
        </Link>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Stock</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(products.data?.results ?? []).map((p) => (
              <tr key={p.id} className="border-b border-slate-50">
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3">{formatCurrency(p.price)}</td>
                <td className="px-4 py-3">{p.stock}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Link href={`/seller/products/${p.id}`}>
                      <Button size="sm" variant="outline">
                        Edit
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => remove.mutate(p.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
