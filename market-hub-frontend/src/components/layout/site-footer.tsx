import Link from "next/link";
import { Phone, MessageCircle } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="mt-16 bg-blue-600 text-white">
      <div className="container-mh grid gap-10 py-12 md:grid-cols-3">
        <div>
          <p className="font-[family-name:var(--font-outfit)] text-2xl font-bold">
            MarketHub
          </p>
          <p className="mt-3 max-w-xs text-sm text-blue-100">
            A modern multi-vendor marketplace for everything you need.
          </p>
          <div className="mt-5 space-y-2 text-sm text-blue-50">
            <p className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" /> WhatsApp: +1 000 000 0000
            </p>
            <p className="flex items-center gap-2">
              <Phone className="h-4 w-4" /> Call: +1 000 000 0000
            </p>
          </div>
        </div>

        <div>
          <h4 className="mb-4 font-semibold">Most Popular Categories</h4>
          <ul className="space-y-2 text-sm text-blue-100">
            {["Electronics", "Fashion", "Home & Kitchen", "Beauty", "Groceries"].map(
              (c) => (
                <li key={c}>
                  <Link
                    href={`/products?search=${encodeURIComponent(c)}`}
                    className="hover:text-white"
                  >
                    {c}
                  </Link>
                </li>
              ),
            )}
          </ul>
        </div>

        <div>
          <h4 className="mb-4 font-semibold">Customer Services</h4>
          <ul className="space-y-2 text-sm text-blue-100">
            <li>
              <Link href="/orders" className="hover:text-white">
                Track order
              </Link>
            </li>
            <li>
              <Link href="/auth/register" className="hover:text-white">
                Create account
              </Link>
            </li>
            <li>
              <Link href="/products" className="hover:text-white">
                Browse products
              </Link>
            </li>
            <li>
              <Link href="/wishlist" className="hover:text-white">
                Wishlist
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-blue-500/50 py-4 text-center text-xs text-blue-100">
        © {new Date().getFullYear()} MarketHub. All rights reserved.
      </div>
    </footer>
  );
}
