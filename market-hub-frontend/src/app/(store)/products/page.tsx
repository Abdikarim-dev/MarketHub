"use client";

import { Suspense } from "react";
import ProductsPage from "./products-client";
import { Skeleton } from "@/components/ui/skeleton";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="container-mh grid grid-cols-2 gap-4 py-8 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-72" />
          ))}
        </div>
      }
    >
      <ProductsPage />
    </Suspense>
  );
}
