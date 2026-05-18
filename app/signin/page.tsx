"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
        setError(res?.error?.message || "Invalid email or password");
        return;
      }

      // 2️⃣ GET SESSION (ROLE COMES FROM HERE)
      const sessionRes = await fetch("/api/auth/session", {
        credentials: "include",
      });

      const session = await sessionRes.json();
      const role = session?.user?.role as Role;

      if (!role) {
        setError("Role not found");
        return;
      }

      // 3️⃣ REDIRECT BASED ON ROLE
      router.push(roleRoutes[role] || "/");
    } catch (err) {
      console.log(err);
      setError("Server error. Try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md p-6 border rounded-xl">
        <h2 className="text-xl font-bold mb-4">Sign In</h2>

        <input
          placeholder="Email"
          className="w-full border p-2 mb-3"
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          placeholder="Password"
          type="password"
          className="w-full border p-2 mb-3"
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p className="text-red-500 text-sm mb-2">{error}</p>}

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-green-600 text-white p-2"
        >
          {loading ? "Loading..." : "Sign In"}
        </button>

        <p className="mt-3 text-sm">
          No account? <Link href="/signup">Signup</Link>
        </p>
      </div>
    </div>
  );
}
