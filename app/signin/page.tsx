"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/auth-client";

type Role = "CUSTOMER" | "SHOP_OWNER" | "SHOP_MANAGER" | "SUPER_ADMIN";

const roleRoutes: Record<Role, string> = {
  CUSTOMER: "/customer",
  SHOP_OWNER: "/shop-owner",
  SHOP_MANAGER: "/manager",
  SUPER_ADMIN: "/admin",
};

export default function SignInPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    try {
      setLoading(true);
      setError("");

      // 1️⃣ LOGIN
      const res = await signIn.email({
        email,
        password,
      });

      if (!res?.data?.user) {
        setError("Invalid email or password");
        return;
      }

      // 2️⃣ GET SESSION (role is here)
      const sessionRes = await fetch("/api/auth/session");
      const session = await sessionRes.json();

      const role = session?.user?.role as Role;

      if (!role) {
        setError("Role not found. Please contact support.");
        return;
      }

      // 3️⃣ REDIRECT (NO SWITCH)
      router.push(roleRoutes[role] || "/");
    } catch (err) {
      console.log(err);
      setError("Something went wrong during login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md bg-white p-6 rounded-3xl shadow">
        <h2 className="text-xl font-bold mb-4">Sign In</h2>

        {/* EMAIL */}
        <input
          className="w-full border p-2 mb-3 rounded"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {/* PASSWORD */}
        <input
          className="w-full border p-2 mb-3 rounded"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {/* ERROR */}
        {error && <p className="text-red-500 text-sm mb-2">{error}</p>}

        {/* BUTTON */}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-green-600 text-white p-2 rounded"
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </div>
    </div>
  );
}
