"use client";

import { Plus } from "lucide-react";
import Link from "next/link";

const ManagerNavbar = () => {
  return (
    <nav className="flex items-center justify-between px-6 py-3 bg-white shadow-md sticky top-0 z-50">

      {/* Logo / Title */}
      <h1 className="text-xl font-bold text-green-600">
        Admin Panel
      </h1>

      {/* Right Side */}
      <div className="flex items-center gap-4">
        <Link href="/create-product">
          <button className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition">
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        </Link>
      </div>

    </nav>
  );
};

export default ManagerNavbar;