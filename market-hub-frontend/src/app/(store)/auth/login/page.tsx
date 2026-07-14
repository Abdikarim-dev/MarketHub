"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { authApi } from "@/services/api";
import { loginSchema, type LoginValues } from "@/schemas/auth";
import { useAuthStore } from "@/store/auth-store";
import { getErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const data = await authApi.login(values);
      setSession({
        user: data.user,
        access: data.access,
        refresh: data.refresh,
      });
      toast.success("Welcome back");
      const role = data.user.role;
      router.push(
        role === "ADMIN" ? "/admin" : role === "SELLER" ? "/seller" : "/",
      );
    } catch (error) {
      toast.error(getErrorMessage(error, "Invalid credentials"));
    }
  });

  return (
    <div className="container-mh flex min-h-[70vh] items-center justify-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <p className="text-sm font-semibold text-blue-600">MarketHub</p>
          <CardTitle>Sign in to your account</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" {...form.register("username")} />
              {form.formState.errors.username && (
                <p className="text-xs text-rose-600">
                  {form.formState.errors.username.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                {...form.register("password")}
              />
              {form.formState.errors.password && (
                <p className="text-xs text-rose-600">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? "Signing in..." : "Sign in"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-slate-500">
            New here?{" "}
            <Link href="/auth/register" className="font-semibold text-blue-600">
              Create an account
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
