"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { signUp } from "@/lib/auth-client";

const SignUpPage = () => {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignUp = async () => {
    try {
      setLoading(true);
      setError("");

      // ❌ validation fix
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }

      if (!name || !email || !password) {
        setError("All fields are required");
        return;
      }

      const res = await signUp.email({
        email,
        password,
        name,
      });

      // ❌ error handling
      if (!res || res.error) {
        setError("Signup failed. Try again.");
        return;
      }

      // ✅ redirect after signup
      router.push("/customer");

    } catch (err) {
      console.log(err);
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">

      <Card className="w-[380px] shadow-lg rounded-2xl">

        <CardHeader>
          <CardTitle className="text-center text-2xl font-semibold">
            Create Account
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">

          {/* NAME */}
          <Input
            type="text"
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          {/* EMAIL */}
          <Input
            type="email"
            placeholder="Enter Gmail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          {/* PASSWORD */}
          <Input
            type="password"
            placeholder="Create Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {/* CONFIRM PASSWORD */}
          <Input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          {/* ERROR */}
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          {/* BUTTON */}
          <Button
            className="w-full"
            onClick={handleSignUp}
            disabled={loading}
          >
            {loading ? "Creating account..." : "Sign Up"}
          </Button>

          {/* LOGIN LINK */}
          <p className="text-sm text-center text-gray-500">
            Already have an account?{" "}
            <Link href="/signin" className="text-green-600 hover:underline">
              Sign In
            </Link>
          </p>

        </CardContent>
      </Card>

    </div>
  );
};

export default SignUpPage;