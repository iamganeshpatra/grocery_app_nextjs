"use client";

import Link from "next/link";
import { UserCircle } from "lucide-react";

const SuperAdminNavbar = () => {
  return (
    <nav className="w-full border-b bg-white shadow-sm">
      <div className="mx-auto flex h-16 items-center justify-between px-6">
        {/* Left Side */}
        <div>
          <h1 className="text-2xl font-bold text-black">Super Admin</h1>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-2">
          <Link
            href="/admin"
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
          >
            Home
          </Link>

          <Link
            href="/admin/products"
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
          >
            Products
          </Link>

          <Link
            href="/admin/shop-owners"
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
          >
            Shop Owners
          </Link>

          <Link
            href="/admin/users"
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
          >
            Users
          </Link>

          <Link
            href="#"
            className="ml-2 flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
          >
            <UserCircle size={18} />
            <span>Profile</span>
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default SuperAdminNavbar;
