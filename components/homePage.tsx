"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Store } from "lucide-react";

const SelectUserTypePage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white flex items-center justify-center px-4">
      <Card className="w-full max-w-3xl rounded-3xl border-0 shadow-xl overflow-hidden">
        <CardContent className="p-8 sm:p-12">
          {/* Heading */}
          <div className="text-center mb-10">
            <p className="text-green-600 font-semibold tracking-widest text-sm uppercase">
              Welcome
            </p>

            <h1 className="text-3xl sm:text-5xl font-bold text-gray-900 mt-3">
              Are You A
            </h1>

            <p className="text-gray-500 mt-3 text-sm sm:text-base">
              Choose how you want to continue
            </p>

            <p className="text-sm text-gray-500 mt-4">
              Already have an account?{" "}
              <Link
                href="/signin"
                className="text-green-600 font-semibold hover:underline"
              >
                Sign In
              </Link>
            </p>
          </div>

          {/* Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Seller */}
            <Link href="/signup/shop-owner">
              <div className="group border rounded-3xl p-8 bg-white hover:bg-green-50 hover:border-green-500 transition cursor-pointer h-full">
                <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center mb-5 group-hover:scale-110 transition">
                  <Store className="w-8 h-8 text-green-600" />
                </div>

                <h2 className="text-2xl font-bold text-gray-800">Seller</h2>

                <p className="text-sm text-gray-500 mt-2 leading-6">
                  Manage your products, orders, inventory and grow your store.
                </p>

                <Button className="mt-6 w-full bg-green-600 hover:bg-green-700 rounded-xl">
                  Continue as Seller
                </Button>
              </div>
            </Link>

            {/* Buyer */}
            <Link href="/signup/customer">
              <div className="group border rounded-3xl p-8 bg-white hover:bg-green-50 hover:border-green-500 transition cursor-pointer h-full">
                <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center mb-5 group-hover:scale-110 transition">
                  <ShoppingCart className="w-8 h-8 text-green-600" />
                </div>

                <h2 className="text-2xl font-bold text-gray-800">Buyer</h2>

                <p className="text-sm text-gray-500 mt-2 leading-6">
                  Explore products, place orders and enjoy easy shopping.
                </p>

                <Button className="mt-6 w-full bg-green-600 hover:bg-green-700 rounded-xl">
                  Continue as Buyer
                </Button>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SelectUserTypePage;
