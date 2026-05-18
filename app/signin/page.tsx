"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, authClient } from "@/lib/auth-client";

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

      const res = await signIn.email({
        email,
        password,
      });

      if (!res?.data?.user) {
        setError("Invalid email or password");
        return;
      }

      // ✅ FIXED
      const session = await authClient.getSession();
      const role = session?.data?.user?.role;

      if (role === "CUSTOMER") router.push("/customer");
      else if (role === "SHOP_OWNER") router.push("/shop-owner");
      else if (role === "SHOP_MANAGER") router.push("/manager");
      else if (role === "SUPER_ADMIN") router.push("/admin");
      else router.push("/");
    } catch (err) {
      console.log(err);
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md bg-white p-6 rounded-3xl shadow">
        <h2 className="text-xl font-bold mb-4">Sign In</h2>

        <input
          className="w-full border p-2 mb-3 rounded"
          placeholder="Email"
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="w-full border p-2 mb-3 rounded"
          type="password"
          placeholder="Password"
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p className="text-red-500 text-sm mb-2">{error}</p>}

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
