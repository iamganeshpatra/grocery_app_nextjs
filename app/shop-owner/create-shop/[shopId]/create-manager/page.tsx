"use client";

import { completeShopManagerSignup } from "@/actions/account.actions";
import { signUp } from "@/lib/auth-client";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

const ShopManagerSignUp = () => {
  const router = useRouter();
  const params = useParams();
  const shopId = params.shopId as string;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleShopManager = async () => {
    const res = await signUp.email({
      email,
      password,
      name,
    });

    if (!res.data?.user?.id) return;

    await completeShopManagerSignup(res.data.user.id, shopId);

    router.push(`/shop-owner/create-shop/${shopId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-xl border border-gray-100 p-8">
        {/* HEADER */}
        <div className="text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-green-100 text-4xl shadow-sm">
            👨‍💼
          </div>

          <h2 className="mt-5 text-3xl font-bold text-gray-800">
            Create Shop Manager
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Add a manager to help manage your shop
          </p>
        </div>

        {/* FORM */}
        <div className="mt-8 flex flex-col gap-5">
          {/* NAME */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Full Name
            </label>

            <input
              placeholder="Enter manager name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
            />
          </div>

          {/* EMAIL */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Email Address
            </label>

            <input
              placeholder="Enter email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
            />
          </div>

          {/* PASSWORD */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Password
            </label>

            <input
              placeholder="Enter password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
            />
          </div>

          {/* BUTTON */}
          <button
            onClick={handleShopManager}
            className="mt-3 rounded-2xl bg-green-600 py-3 text-sm font-semibold text-white shadow-md transition hover:scale-[1.02] hover:bg-green-700 active:scale-[0.98]"
          >
            Create Manager
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShopManagerSignUp;
