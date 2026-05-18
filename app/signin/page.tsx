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

      const res = await signIn.email({
        email,
        password,
      });

      if (!res || res.error) {
        setError("Invalid email or password");
        return;
      }

      // get session (important for role-based redirect)
      const session = await fetch("/api/auth/get-session").then((r) =>
        r.json(),
      );

      const role = session?.user?.role;

      // role-based redirect
      if (role === "CUSTOMER") {
        router.push("/customer");
      } else if (role === "SHOP_OWNER") {
        router.push("/shop-owner");
      } else if (role === "SHOP_MANAGER") {
        router.push("/manager");
      } else if (role === "SUPER_ADMIN") {
        router.push("/admin");
      } else {
        router.push("/");
      }
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
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-gray-800">
            Welcome Back
          </CardTitle>
          <p className="text-sm text-gray-500">Sign in to continue</p>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* EMAIL */}
          <Input
            type="email"
            placeholder="Enter email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 rounded-xl"
          />

          {/* PASSWORD */}
          <Input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 rounded-xl"
          />

          {/* ERROR */}
          {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

          {/* BUTTON */}
          <Button
            onClick={handleLogin}
            disabled={loading}
            className="w-full h-11 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl"
          >
            {loading ? "Signing in..." : "Sign In"}
          </Button>

          {/* LINKS */}
          <p className="text-sm text-center text-gray-500">
            Don’t have an account?{" "}
            <Link href="/signup" className="text-green-600 font-medium">
              Sign Up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SignInPage;
