"use client";

import Link from "next/link";
import { LayoutDashboard, Plus, ShoppingBag, Store } from "lucide-react";

const ManagerNavbar = () => {
  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* LEFT */}
          <div className="flex items-center gap-3">
            {/* LOGO */}
            <div className="w-10 h-10 rounded-2xl bg-green-600 flex items-center justify-center shadow-md">
              <Store className="w-5 h-5 text-white" />
            </div>

            {/* TITLE */}
            <div>
              <h1 className="text-base sm:text-xl font-bold text-gray-800">
                MyMart Admin
              </h1>

              <p className="hidden sm:block text-xs text-gray-500">
                Manage products & inventory
              </p>
            </div>
          </div>

          {/* RIGHT */}
          <div className="flex items-center gap-2">
            {/* DASHBOARD */}
            <Link href="/manager">
              <button className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all">
                <LayoutDashboard className="w-4 h-4 text-gray-600" />

                <span className="text-sm font-medium text-gray-700">
                  Dashboard
                </span>
              </button>
            </Link>

            {/* ADD PRODUCT */}
            <Link href="/create-product">
              <button className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 sm:px-5 py-2.5 rounded-2xl shadow-md transition-all active:scale-95">
                <Plus className="w-4 h-4" />

                <span className="hidden sm:block text-sm font-semibold">
                  Add Product
                </span>
              </button>
            </Link>

            {/* MANAGE PRODUCTS */}
            <Link href="/manage-products">
              <button className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-3 sm:px-5 py-2.5 rounded-2xl shadow-md transition-all active:scale-95">
                <ShoppingBag className="w-4 h-4" />

                <span className="hidden sm:block text-sm font-semibold">
                  Manage
                </span>
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* MOBILE BOTTOM NAV */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
        <div className="grid grid-cols-3 h-16">
          {/* DASHBOARD */}
          <Link
            href="/manager"
            className="flex flex-col items-center justify-center text-gray-600 active:scale-95 transition"
          >
            <LayoutDashboard className="w-5 h-5" />

            <span className="text-[11px] mt-1">Dashboard</span>
          </Link>

          {/* ADD PRODUCT */}
          <Link
            href="/create-product"
            className="flex flex-col items-center justify-center text-green-600 active:scale-95 transition"
          >
            <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center -mt-6 shadow-lg">
              <Plus className="w-5 h-5 text-white" />
            </div>

            <span className="text-[11px] mt-1 font-medium">Add</span>
          </Link>

          {/* MANAGE */}
          <Link
            href="/manage-products"
            className="flex flex-col items-center justify-center text-gray-600 active:scale-95 transition"
          >
            <ShoppingBag className="w-5 h-5" />

            <span className="text-[11px] mt-1">Manage</span>
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default ManagerNavbar;
