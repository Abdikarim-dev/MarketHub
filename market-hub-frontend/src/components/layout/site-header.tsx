"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Heart,
  Menu,
  Moon,
  Search,
  ShoppingCart,
  Sun,
  UserRound,
  X,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/auth-store";
import { useCartStore } from "@/store/cart-store";
import { useWishlistStore } from "@/store/wishlist-store";
import { CartDrawer } from "@/components/layout/cart-drawer";

const NAV = [
  "Groceries",
  "Premium Fruits",
  "Home & Kitchen",
  "Fashion",
  "Electronics",
  "Beauty",
  "Home Improvement",
  "Sports",
];

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const totalItems = useCartStore((s) => s.totalItems());
  const wishlistCount = useWishlistStore((s) => s.items.length);
  const [q, setQ] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = q.trim();
    router.push(query ? `/products?search=${encodeURIComponent(query)}` : "/products");
    setMobileOpen(false);
  };

  const dashboardHref =
    user?.role === "ADMIN"
      ? "/admin"
      : user?.role === "SELLER"
        ? "/seller"
        : "/account";

  return (
    <>
      <div className="border-b border-slate-200 bg-slate-50 text-xs text-slate-600">
        <div className="container-mh flex items-center justify-between gap-4 py-2">
          <p>Welcome to worldwide MarketHub!</p>
          <div className="hidden items-center gap-4 sm:flex">
            <Link href="/orders" className="hover:text-blue-600">
              Track order
            </Link>
            <Link href="/products?ordering=-created_at" className="hover:text-blue-600">
              Offers
            </Link>
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="container-mh flex items-center gap-3 py-3 sm:gap-5">
          <button
            className="rounded-lg p-2 hover:bg-slate-100 lg:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <Link href="/" className="shrink-0 font-[family-name:var(--font-outfit)] text-2xl font-bold tracking-tight text-blue-600">
            MarketHub
          </Link>

          <form onSubmit={onSearch} className="relative hidden flex-1 md:block">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search essentials, groceries and more..."
              className="h-12 rounded-2xl border-slate-200 bg-slate-50 pl-10"
            />
          </form>

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            {mounted && (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Toggle theme"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
            )}

            <Link href="/wishlist" className="relative rounded-xl p-2 hover:bg-slate-100">
              <Heart className="h-5 w-5" />
              {wishlistCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">
                  {wishlistCount}
                </span>
              )}
            </Link>

            <button
              className="relative rounded-xl p-2 hover:bg-slate-100"
              onClick={() => setCartOpen(true)}
              aria-label="Open cart"
            >
              <ShoppingCart className="h-5 w-5" />
              {totalItems > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">
                  {totalItems}
                </span>
              )}
            </button>

            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  href={dashboardHref}
                  className="hidden items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium hover:bg-slate-100 sm:flex"
                >
                  <UserRound className="h-4 w-4" />
                  {user.username}
                </Link>
                <Button variant="outline" size="sm" onClick={logout}>
                  Logout
                </Button>
              </div>
            ) : (
              <Link href="/auth/login">
                <Button variant="outline" size="sm" className="gap-2">
                  <UserRound className="h-4 w-4" />
                  <span className="hidden sm:inline">Sign Up / Sign In</span>
                </Button>
              </Link>
            )}
          </div>
        </div>

        <nav className="hidden border-t border-slate-100 lg:block">
          <div className="container-mh flex gap-2 overflow-x-auto py-3">
            {NAV.map((label) => (
              <Link
                key={label}
                href={`/products?search=${encodeURIComponent(label.split(" ")[0])}`}
                className="shrink-0 rounded-full bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
              >
                {label}
              </Link>
            ))}
          </div>
        </nav>

        {mobileOpen && (
          <div className="border-t border-slate-100 bg-white p-4 lg:hidden">
            <form onSubmit={onSearch} className="mb-4">
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search products..."
              />
            </form>
            <div className="grid gap-2">
              <Link href="/products" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2 hover:bg-slate-50">
                All products
              </Link>
              <Link href="/orders" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2 hover:bg-slate-50">
                Orders
              </Link>
              {user?.role === "SELLER" && (
                <Link href="/seller" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2 hover:bg-slate-50">
                  Seller dashboard
                </Link>
              )}
              {user?.role === "ADMIN" && (
                <Link href="/admin" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2 hover:bg-slate-50">
                  Admin dashboard
                </Link>
              )}
            </div>
          </div>
        )}
      </header>

      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />

      {pathname === "/" ? null : (
        <div className="sr-only" aria-hidden>
          MarketHub
        </div>
      )}
    </>
  );
}
