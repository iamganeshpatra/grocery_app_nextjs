"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/auth-client";

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

      if (!email || !password) {
        setError("All fields are required");
        return;
      }

      // ✅ LOGIN (BetterAuth)
      const res = await signIn.email({
        email,
        password,
      });

      if (!res?.data?.user) {
        setError("Invalid email or password");
        return;
      }

      // ✅ ROLE FROM LOGIN RESPONSE
      const role = res.data.user.role;

      // ✅ REDIRECT BASED ON ROLE
      switch (role) {
        case "CUSTOMER":
          router.push("/customer");
          break;

        case "SHOP_OWNER":
          router.push("/shop-owner");
          break;

        case "SHOP_MANAGER":
          router.push("/manager");
          break;

        case "SUPER_ADMIN":
          router.push("/admin");
          break;

        default:
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
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md bg-white p-6 rounded-3xl shadow">
        <h2 className="text-xl font-bold mb-4">Sign In</h2>

        <input
          className="w-full border p-2 mb-3 rounded"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="w-full border p-2 mb-3 rounded"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p className="text-red-500 text-sm mb-2">{error}</p>}

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-green-600 text-white p-2 rounded disabled:opacity-60"
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </div>
    </div>
  );
}
