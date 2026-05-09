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

      const res = await signIn.email({
        email,
        password,
      });

      if (!res || res.error) {
        setError("Invalid email or password");
        return;
      }

      router.push("/auth-redirect");
    } catch (err) {
      console.log(err);
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 p-4">

      <Card className="w-full max-w-md shadow-2xl rounded-2xl border-0">

        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-3xl font-bold text-gray-800">
            Welcome Back 👋
          </CardTitle>
          <p className="text-sm text-gray-500">
            Login to continue to your dashboard
          </p>
        </CardHeader>

        <CardContent className="space-y-4">

          <Input
            type="email"
            placeholder="Enter Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11"
          />

          <Input
            type="password"
            placeholder="Enter Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11"
          />

          {error && (
            <p className="text-red-500 text-sm font-medium">
              {error}
            </p>
          )}

          <Button
            className="w-full h-11 bg-green-600 hover:bg-green-700 text-white font-semibold"
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In"}
          </Button>

          {/* Signup Link (ADDED) */}
          <p className="text-sm text-center text-gray-600">
            Don’t have an account?{" "}
            <Link
              href="/signup"
              className="text-green-600 font-medium hover:underline"
            >
              Create account
            </Link>
          </p>

        </CardContent>

      </Card>
    </div>
  );
};

export default SignInPage;