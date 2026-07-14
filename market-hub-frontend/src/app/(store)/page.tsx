"use client";

import Image from "next/image";
import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { categoriesApi, productsApi } from "@/services/api";
import { ProductCard } from "@/features/products/components/product-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { mediaUrl } from "@/lib/utils";

const HERO_SLIDES = [
  {
    title: "SMART WEARABLE",
    subtitle: "Up to 80% OFF on connected gadgets",
    cta: "Shop now",
    href: "/products?search=watch",
    tone: "from-[#123f87] to-[#0b72e7]",
  },
  {
    title: "HOME ESSENTIALS",
    subtitle: "Refresh your space with trusted brands",
    cta: "Explore",
    href: "/products?search=home",
    tone: "from-[#0f766e] to-[#14b8a6]",
  },
  {
    title: "ELECTRONICS FEST",
    subtitle: "Laptops, phones and accessories live now",
    cta: "Browse deals",
    href: "/products?category=",
    tone: "from-[#1e1b4b] to-[#4f46e5]",
  },
];

export default function HomePage() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const products = useQuery({
    queryKey: ["home-products"],
    queryFn: () => productsApi.list({ page_size: 10, ordering: "-created_at" }),
  });
  const categories = useQuery({
    queryKey: ["home-categories"],
    queryFn: () => categoriesApi.list({ page_size: 8 }),
  });

  return (
    <div>
      <section className="container-mh py-6">
        <div className="relative overflow-hidden rounded-3xl">
          <div ref={emblaRef} className="overflow-hidden">
            <div className="flex">
              {HERO_SLIDES.map((slide) => (
                <div
                  key={slide.title}
                  className={`min-w-0 flex-[0_0_100%] bg-gradient-to-r ${slide.tone} px-8 py-14 text-white sm:px-14 sm:py-20`}
                >
                  <p className="font-[family-name:var(--font-outfit)] text-4xl font-extrabold tracking-tight sm:text-6xl">
                    MarketHub
                  </p>
                  <h1 className="mt-4 max-w-xl text-2xl font-bold sm:text-4xl">
                    {slide.title}
                  </h1>
                  <p className="mt-3 max-w-md text-sm text-white/85 sm:text-base">
                    {slide.subtitle}
                  </p>
                  <Link href={slide.href}>
                    <Button className="mt-6 bg-white text-blue-700 hover:bg-blue-50">
                      {slide.cta}
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </div>
          <button
            className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/20 text-white backdrop-blur hover:bg-white/30"
            onClick={() => emblaApi?.scrollPrev()}
            aria-label="Previous slide"
          >
            <ChevronLeft />
          </button>
          <button
            className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/20 text-white backdrop-blur hover:bg-white/30"
            onClick={() => emblaApi?.scrollNext()}
            aria-label="Next slide"
          >
            <ChevronRight />
          </button>
        </div>
      </section>

      <section className="container-mh py-8">
        <div className="mb-5 flex items-end justify-between">
          <h2 className="section-title">
            Grab the best deal on <span>Products</span>
          </h2>
          <Link href="/products" className="text-sm font-semibold text-blue-600">
            View All →
          </Link>
        </div>
        {products.isLoading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-72" />
            ))}
          </div>
        ) : products.isError ? (
          <p className="rounded-2xl border border-rose-100 bg-rose-50 p-6 text-sm text-rose-700">
            Could not load products. Make sure the Django API is running on
            port 8000.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            {products.data?.results.map((p, idx) => (
              <ProductCard key={p.id} product={p} highlighted={idx === 1} />
            ))}
          </div>
        )}
      </section>

      <section className="container-mh py-10">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="section-title">
            Shop From Top <span>Categories</span>
          </h2>
        </div>
        <div className="flex gap-6 overflow-x-auto pb-2">
          {(categories.data?.results ?? []).map((cat, i) => (
            <Link
              key={cat.id}
              href={`/products?category=${cat.slug || cat.id}`}
              className="flex w-24 shrink-0 flex-col items-center gap-2"
            >
              <div
                className={`grid h-20 w-20 place-items-center rounded-full bg-slate-100 text-lg font-bold text-blue-700 ring-2 ${
                  i === 0 ? "ring-blue-500" : "ring-transparent"
                }`}
              >
                {cat.name.slice(0, 1)}
              </div>
              <span className="text-center text-xs font-medium text-slate-700">
                {cat.name}
              </span>
            </Link>
          ))}
          {!categories.data?.results?.length && !categories.isLoading && (
            <p className="text-sm text-slate-500">No categories yet.</p>
          )}
        </div>
      </section>

      <section className="container-mh pb-14">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="section-title">
            Top Electronics <span>Brands</span>
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { name: "iPhone", tone: "from-slate-900 to-slate-700", label: "UP TO 80% OFF" },
            { name: "Realme", tone: "from-amber-400 to-yellow-300", label: "UP TO 60% OFF" },
            { name: "Xiaomi", tone: "from-orange-500 to-orange-400", label: "UP TO 70% OFF" },
          ].map((brand) => (
            <Link
              key={brand.name}
              href={`/products?search=${brand.name}`}
              className={`rounded-3xl bg-gradient-to-br ${brand.tone} p-6 text-white shadow-sm transition hover:scale-[1.01]`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
                Featured brand
              </p>
              <h3 className="mt-2 font-[family-name:var(--font-outfit)] text-3xl font-bold">
                {brand.name}
              </h3>
              <p className="mt-8 inline-flex rounded-full bg-white/20 px-3 py-1 text-xs font-bold">
                {brand.label}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="container-mh pb-16">
        <h2 className="section-title mb-6">
          Daily <span>Essentials</span>
        </h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {(products.data?.results.slice(0, 4) ?? []).map((p) => {
            const img = mediaUrl(p.image);
            return (
              <Link
                key={p.id}
                href={`/products/${p.id}`}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-300"
              >
                <div className="relative mb-3 aspect-square overflow-hidden rounded-xl bg-white">
                  {img ? (
                    <Image src={img} alt={p.name} fill className="object-contain p-3" />
                  ) : null}
                </div>
                <p className="line-clamp-1 text-sm font-semibold">{p.name}</p>
                <p className="text-xs font-bold text-slate-900">UP TO 50% OFF</p>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
