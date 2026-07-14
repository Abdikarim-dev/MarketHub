import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-4 text-center">
      <p className="font-[family-name:var(--font-outfit)] text-6xl font-bold text-blue-600">
        404
      </p>
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="max-w-md text-sm text-slate-500">
        The page you are looking for doesn’t exist or has moved.
      </p>
      <Link href="/">
        <Button>Back to MarketHub</Button>
      </Link>
    </div>
  );
}
