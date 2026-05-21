"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn, authClient } from "@/lib/auth-client";
import { getManagerShop } from "@/actions/account.actions";

type Role = "CUSTOMER" | "SHOP_OWNER" | "SHOP_MANAGER" | "SUPER_ADMIN";

const roleRoutes: Record<string, string> = {
  CUSTOMER: "/customer",
  SHOP_OWNER: "/shop-owner",
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

      // 2️⃣ GET SESSION
      const session = await authClient.getSession();

      const user = session?.data?.user;

      if (!user) {
        setError("User not found");
        return;
      }

      // 3️⃣ SHOP MANAGER REDIRECT
      if (user.role === "SHOP_MANAGER") {
        const manager = await getManagerShop(user.id);

        if (!manager) {
          setError("No shop assigned");
          return;
        }

        router.push(`/shop-owner/create-shop/${manager.shopId}`);

        return;
      }

      // 4️⃣ OTHER ROLE REDIRECT
      router.push(roleRoutes[user.role as keyof typeof roleRoutes] || "/");
    } catch (err) {
      console.log(err);
      setError("Server error. Try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md p-6 border rounded-xl bg-white">
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
          className="w-full bg-green-600 text-white p-2 rounded"
        >
          {loading ? "Loading..." : "Sign In"}
        </button>

        <p className="mt-3 text-sm text-center">
          No account?{" "}
          <Link href="/signup" className="text-green-600">
            Signup
          </Link>
        </p>
      </div>
    </div>
  );
}
