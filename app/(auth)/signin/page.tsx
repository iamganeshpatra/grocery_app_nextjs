"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const result = await signIn.email({ email, password });

    if (result.error) {
      toast.error(result.error.message ?? "Invalid credentials");
      setLoading(false);
      return;
    }

    const redirectTo = searchParams.get("redirect") ?? "/auth-redirect";
    router.push(redirectTo);
  }

  return (
    <Card className="w-full max-w-md rounded-3xl border-0 bg-white/95 shadow-2xl backdrop-blur-md">
      <CardHeader className="space-y-3 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-orange-600 text-3xl shadow-lg">
          Mp
        </div>

        <CardTitle className="bg-gradient-to-r from-emerald-600 via-green-500 to-lime-500 bg-clip-text text-3xl font-extrabold text-transparent">
          Welcome Back
        </CardTitle>

        <CardDescription className="text-base text-gray-500">
          Sign in to continue shopping fresh groceries 🥦
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-emerald-700">
              Email Address
            </label>

            <Input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-xl border-emerald-200 focus-visible:border-emerald-500 focus-visible:ring-emerald-500"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-emerald-700">
                Password
              </label>

              <Link
                href="/forgot-password"
                className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
              >
                Forgot password?
              </Link>
            </div>

            <Input
              type="password"
              required
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-xl border-emerald-200 focus-visible:border-emerald-500 focus-visible:ring-emerald-500"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="h-12 w-full rounded-xl bg-gradient-to-r from-emerald-600 via-green-500 to-lime-500 text-base font-semibold text-white shadow-lg transition-all duration-300 hover:scale-[1.02] hover:from-emerald-700 hover:to-green-600"
          >
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <div className="my-6 flex items-center">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="mx-3 text-xs uppercase tracking-wider text-gray-400">
            OR
          </span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        <p className="text-center text-sm text-gray-500">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-semibold text-emerald-600 transition hover:text-emerald-700"
          >
            Sign Up
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-lime-100 px-4 py-10">
      <Suspense>
        <SignInForm />
      </Suspense>
    </main>
  );
}
