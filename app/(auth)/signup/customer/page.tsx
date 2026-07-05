"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { signUp } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function CustomerSignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    const result = await signUp.email({
      email,
      password,
      name: `${firstName.trim()} ${lastName.trim()}`,
    });

    if (result.error) {
      toast.error(result.error.message ?? "Sign up failed");
      setLoading(false);
      return;
    }

    router.push("/auth-redirect");
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-lime-100 flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-lg rounded-3xl border-0 bg-white/90 shadow-2xl backdrop-blur">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-green-600 text-4xl shadow-lg">
            🛒
          </div>

          <CardTitle className="bg-gradient-to-r from-emerald-600 via-green-500 to-lime-500 bg-clip-text text-3xl font-extrabold text-transparent">
            Create Customer Account
          </CardTitle>

          <CardDescription className="text-base text-gray-500">
            Join thousands of happy customers and enjoy fresh groceries
            delivered to your doorstep.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="mb-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-center">
            <p className="italic text-emerald-700">
              🌿 "Fresh food is the foundation of a healthy life."
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-emerald-700">
                  First Name
                </label>

                <Input
                  required
                  placeholder="Jane"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="rounded-xl border-emerald-200 focus-visible:ring-emerald-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-emerald-700">
                  Last Name
                </label>

                <Input
                  required
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="rounded-xl border-emerald-200 focus-visible:ring-emerald-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-emerald-700">
                Email Address
              </label>

              <Input
                type="email"
                required
                placeholder="jane@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-xl border-emerald-200 focus-visible:ring-emerald-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-emerald-700">
                Password
              </label>

              <Input
                type="password"
                required
                placeholder="Minimum 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-xl border-emerald-200 focus-visible:ring-emerald-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-emerald-700">
                Confirm Password
              </label>

              <Input
                type="password"
                required
                placeholder="Repeat password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="rounded-xl border-emerald-200 focus-visible:ring-emerald-500"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-xl bg-gradient-to-r from-emerald-600 to-green-500 text-base font-semibold text-white shadow-lg hover:from-emerald-700 hover:to-green-600"
            >
              {loading ? "Creating account..." : "Create Customer Account"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Already have an account?{" "}
              <Link
                href="/signin"
                className="font-semibold text-emerald-600 hover:text-emerald-700"
              >
                Sign In
              </Link>
            </p>

            <div className="mt-5 flex flex-wrap justify-center gap-2 text-xs text-gray-400">
              <span>🥦 Fresh Products</span>
              <span>•</span>
              <span>🚚 Fast Delivery</span>
              <span>•</span>
              <span>🛍️ Trusted Stores</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
