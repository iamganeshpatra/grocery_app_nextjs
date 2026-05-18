"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signUp } from "@/lib/auth-client";
import { completeSellerSignup } from "@/actions/account.actions";

const ShopOwnerSignup=()=> {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSignup = async () => {
    const res = await signUp.email({
      email,
      password,
      name,
    });

    if (!res?.data?.user?.id) return;

    // 👇 YOUR SERVER ACTION
    await completeSellerSignup(res.data.user.id);

    router.push("/shop-owner");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md bg-white p-6 rounded-3xl shadow">
        <h2 className="text-xl font-bold mb-4">Shop Owner Sign Up</h2>

        <input
          className="w-full border p-2 mb-3 rounded"
          placeholder="Name"
          onChange={(e) => setName(e.target.value)}
        />

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

        <button
          onClick={handleSignup}
          className="w-full bg-blue-600 text-white p-2 rounded"
        >
          Create Shop Owner
        </button>
      </div>
    </div>
  );
}
export default ShopOwnerSignup