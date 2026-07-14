"use client";

import { useAuthStore } from "@/store/auth-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function AccountPage() {
  const user = useAuthStore((s) => s.user);

  if (!user) {
    return (
      <div className="container-mh py-16 text-center">
        <Link href="/auth/login">
          <Button>Sign in</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container-mh py-8">
      <h1 className="section-title mb-6">
        My <span>Profile</span>
      </h1>
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>{user.username}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-slate-500">Email:</span> {user.email}
          </p>
          <p>
            <span className="text-slate-500">Name:</span>{" "}
            {user.first_name || user.last_name
              ? `${user.first_name} ${user.last_name}`
              : "—"}
          </p>
          <p>
            <span className="text-slate-500">Role:</span> {user.role}
          </p>
          <div className="flex gap-2 pt-4">
            <Link href="/orders">
              <Button variant="outline">My orders</Button>
            </Link>
            {user.role === "SELLER" && (
              <Link href="/seller">
                <Button>Seller dashboard</Button>
              </Link>
            )}
            {user.role === "ADMIN" && (
              <Link href="/admin">
                <Button>Admin dashboard</Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
