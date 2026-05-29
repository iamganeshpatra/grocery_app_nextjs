"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signUp } from "@/lib/auth-client";
import { completeBuyerSignup } from "@/actions/account.actions";

const CustomerSignup=()=> {
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
    await completeBuyerSignup(res.data.user.id);

    router.push("/auth-redirect");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md bg-white p-6 rounded-3xl shadow">
        <h2 className="text-xl font-bold mb-4">Customer Sign Up</h2>

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
          className="w-full bg-green-600 text-white p-2 rounded"
        >
          Create Customer
        </button>
      </div>
    </div>
  );
}
export default CustomerSignup