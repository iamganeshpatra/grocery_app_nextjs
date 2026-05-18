"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { signIn } from "@/lib/auth-client";

const SignInPage = () => {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    try {
      setLoading(true);
      setError("");

      // validation
      if (!email || !password) {
        setError("All fields are required");
        return;
      }

      // signin
      const res = await signIn.email({
        email,
        password,
      });

      // failed
      if (!res || res.error) {
        setError("Invalid email or password");
        return;
      }

      // redirect page
      router.push("/auth-redirect");
    } catch (err) {
      console.log(err);
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center px-4">
      <Card className="w-full max-w-md rounded-3xl border-0 shadow-xl">
        {/* TOP */}
        <CardHeader className="space-y-2 text-center pb-2">
          <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center text-3xl mx-auto">
            🛒
          </div>

          <CardTitle className="text-3xl font-bold text-gray-800">
            Welcome Back
          </CardTitle>

          <p className="text-sm text-gray-500">
            Sign in to continue to your dashboard
          </p>
        </CardHeader>

        {/* BODY */}
        <CardContent className="space-y-4 pt-4">
          {/* EMAIL */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Email</label>

            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 rounded-xl"
            />
          </div>

          {/* PASSWORD */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">
              Password
            </label>

            <Input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 rounded-xl"
            />
          </div>

          {/* ERROR */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              <p className="text-sm text-red-500 font-medium">{error}</p>
            </div>
          )}

          {/* BUTTON */}
          <Button
            onClick={handleLogin}
            disabled={loading}
            className="w-full h-11 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold"
          >
            {loading ? "Signing In..." : "Sign In"}
          </Button>

          {/* LINKS */}
          <div className="space-y-2 pt-2">
            <p className="text-sm text-center text-gray-600">
              Don&apos;t have an account?
            </p>

            <div className="grid grid-cols-2 gap-3">
              <Link href="/signup/customer">
                <Button variant="outline" className="w-full rounded-xl">
                  Buyer
                </Button>
              </Link>

              <Link href="/signup/shop-owner">
                <Button variant="outline" className="w-full rounded-xl">
                  Seller
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SignInPage;
