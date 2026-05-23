import Link from "next/link";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

const ShopOwnerNavbar = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const sessionUser = session?.user;

  if (!sessionUser) {
    redirect("/signin");
  }

  const shopOwner = await prisma.user.findUnique({
    where: {
      id: sessionUser.id,
    },
  });

  return (
    <nav className="sticky top-0 z-50 border-b border-green-100 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        {/* LEFT */}
        <Link href="/shop-owner" className="group flex items-center gap-4">
          {/* LOGO */}
          <div className="flex h-14 w-14 items-center justify-center rounded-3xl border border-green-200 bg-gradient-to-br from-green-100 to-emerald-50 text-3xl shadow-sm transition duration-300 group-hover:scale-105">
            🏪
          </div>

          {/* TEXT */}
          <div className="space-y-1">
            <h1 className="text-2xl font-black tracking-wide text-gray-800">
              <span className="font-serif italic font-semibold">
                Welcome Back,
              </span>

              <span className="ml-2 uppercase text-green-700">
                {shopOwner?.name}
              </span>
            </h1>

            <p className="text-sm font-medium tracking-wide text-gray-500">
              Manage your shops, products & business smoothly ✨
            </p>
          </div>
        </Link>

        {/* RIGHT */}
        {/* RIGHT */}
        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/shop-owner"
            className="group relative overflow-hidden rounded-2xl border border-transparent bg-gradient-to-r from-green-50 to-emerald-50 px-5 py-2.5 text-sm font-bold tracking-wide text-gray-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-green-200 hover:shadow-md"
          >
            <span className="relative z-10 transition group-hover:text-green-700">
              Home
            </span>

            <div className="absolute inset-0 bg-gradient-to-r from-green-100 to-emerald-100 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          </Link>

          <Link
            href="/shop-owner/about"
            className="group relative overflow-hidden rounded-2xl border border-transparent bg-gradient-to-r from-green-50 to-emerald-50 px-5 py-2.5 text-sm font-bold tracking-wide text-gray-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-green-200 hover:shadow-md"
          >
            <span className="relative z-10 transition group-hover:text-green-700">
              About
            </span>

            <div className="absolute inset-0 bg-gradient-to-r from-green-100 to-emerald-100 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          </Link>

          <Link
            href="/shop-owner/stats"
            className="group relative overflow-hidden rounded-2xl border border-transparent bg-gradient-to-r from-green-50 to-emerald-50 px-5 py-2.5 text-sm font-bold tracking-wide text-gray-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-green-200 hover:shadow-md"
          >
            <span className="relative z-10 transition group-hover:text-green-700">
              Stats
            </span>

            <div className="absolute inset-0 bg-gradient-to-r from-green-100 to-emerald-100 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          </Link>

          <Link
            href="/shop-owner/contact"
            className="group relative overflow-hidden rounded-2xl border border-transparent bg-gradient-to-r from-green-50 to-emerald-50 px-5 py-2.5 text-sm font-bold tracking-wide text-gray-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-green-200 hover:shadow-md"
          >
            <span className="relative z-10 transition group-hover:text-green-700">
              Contact
            </span>

            <div className="absolute inset-0 bg-gradient-to-r from-green-100 to-emerald-100 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default ShopOwnerNavbar;
