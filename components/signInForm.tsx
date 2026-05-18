"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SignUpUsers } from "@/actions/auth.actions";


type SignUpProps = {
  title: string;
  role: string;
};

const SignUpPage = ({ title, role }: SignUpProps) => {
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

      // validation
      if (!name || !email || !password || !confirmPassword) {
        setError("All fields are required");
        return;
      }

      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }

      // signup user
      const res = await SignUpUsers({
        name,
        email,
        password,
        role,
      });

      // failed
      if (!res.success) {
        setError("Signup failed");
        return;
      }

      // redirect by role
      if (role === "CUSTOMER") {
        router.push("/customer");
      } else if (role === "SHOP_OWNER") {
        router.push("/shop-owner");
      } else if (role === "SHOP_MANAGER") {
        router.push("/manager");
      } else if (role === "SUPER_ADMIN") {
        router.push("/admin");
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 px-4">
      <Card className="w-full max-w-[400px] shadow-lg rounded-2xl border-0">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold">
            {title}
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
            placeholder="Enter Email"
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
          {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

          {/* BUTTON */}
          <Button
            className="w-full bg-green-600 hover:bg-green-700"
            onClick={handleSignUp}
            disabled={loading}
          >
            {loading ? "Creating Account..." : "Sign Up"}
          </Button>

          {/* LOGIN */}
          <p className="text-sm text-center text-gray-500">
            Already have an account?{" "}
            <Link
              href="/signin"
              className="text-green-600 hover:underline font-medium"
            >
              Sign In
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SignUpPage;
