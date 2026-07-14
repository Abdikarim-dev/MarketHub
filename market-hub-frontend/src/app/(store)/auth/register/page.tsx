"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { authApi } from "@/services/api";
import { registerSchema, type RegisterValues } from "@/schemas/auth";
import { getErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RegisterPage() {
  const router = useRouter();
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      password_confirm: "",
      first_name: "",
      last_name: "",
      role: "CUSTOMER",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await authApi.register(values);
      toast.success("Account created — please sign in");
      router.push("/auth/login");
    } catch (error) {
      toast.error(getErrorMessage(error, "Registration failed"));
    }
  });

  return (
    <div className="container-mh flex min-h-[70vh] items-center justify-center py-12">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <p className="text-sm font-semibold text-blue-600">MarketHub</p>
          <CardTitle>Create your account</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" {...form.register("username")} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...form.register("email")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="first_name">First name</Label>
              <Input id="first_name" {...form.register("first_name")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last name</Label>
              <Input id="last_name" {...form.register("last_name")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" {...form.register("password")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password_confirm">Confirm password</Label>
              <Input
                id="password_confirm"
                type="password"
                {...form.register("password_confirm")}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="role">I want to join as</Label>
              <select
                id="role"
                className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                {...form.register("role")}
              >
                <option value="CUSTOMER">Customer</option>
                <option value="SELLER">Seller</option>
              </select>
            </div>
            <Button
              type="submit"
              className="sm:col-span-2"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? "Creating..." : "Create account"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link href="/auth/login" className="font-semibold text-blue-600">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
