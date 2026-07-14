import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  value: string | number,
  currency = "USD",
  locale = "en-US",
) {
  const amount = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function mediaUrl(path?: string | null) {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const api = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, "") ?? "";
  return `${api}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Prefer gallery / primary_image, fall back to legacy image field. */
export function productImageUrl(product: {
  primary_image?: string | null;
  image?: string | null;
  images?: { url: string }[];
}) {
  return (
    mediaUrl(product.primary_image) ||
    mediaUrl(product.images?.[0]?.url) ||
    mediaUrl(product.image)
  );
}
