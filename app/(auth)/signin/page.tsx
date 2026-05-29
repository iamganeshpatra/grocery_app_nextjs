"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "@/lib/auth-client";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    try {
      setLoading(true);
      setError("");

      // ✅ LOGIN
      const res = await signIn.email({
        email,
        password,
      });

      if (!res?.data?.user) {
        setError(res?.error?.message || "Invalid email or password");
        return;
      }

      // ✅ REDIRECT TO AUTH REDIRECT PAGE
      window.location.href = "/auth-redirect";
    } catch (err) {
      console.log(err);
      setError("Server error. Try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-white px-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-green-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
            M
          </div>

          <h1 className="text-3xl font-bold mt-4 text-gray-800">
            Welcome Back
          </h1>

          <p className="text-sm text-gray-500 mt-2 text-center">
            Sign in to continue shopping
          </p>
        </div>

        {/* Email */}
        <div className="mb-4">
          <label className="text-sm font-medium text-gray-700">Email</label>

          <input
            type="email"
            placeholder="Enter your email"
            className="w-full mt-2 border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500"
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {/* Password */}
        <div className="mb-4">
          <label className="text-sm font-medium text-gray-700">Password</label>

          <input
            type="password"
            placeholder="Enter your password"
            className="w-full mt-2 border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500"
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {/* Error */}
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        {/* Button */}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700 transition-all text-white py-3 rounded-2xl font-semibold"
        >
          {loading ? "Signing In..." : "Sign In"}
        </button>

        {/* Signup */}
        <p className="mt-5 text-sm text-center text-gray-500">
          Don&apos;t have an account?{" "}
          <Link
            href="/"
            className="text-green-600 font-semibold hover:underline"
          >
            Signup
          </Link>
        </p>
      </div>
    </div>
  );
}
