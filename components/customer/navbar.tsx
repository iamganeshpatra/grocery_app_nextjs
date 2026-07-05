"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function CustomerNavbar({
  userName,
  cartCount,
}: {
  userName: string;
  cartCount: number;
}) {
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    toast.success("Signed out");
    router.push("/signin");
  }

  return (
    <header className="sticky top-0 z-50 border-b border-emerald-100 bg-white shadow-md">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        {/* Left */}
        <div className="flex min-w-0 items-center gap-2 sm:gap-3 lg:gap-8">
          <Link href="/customer" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-orange-500 text-sm font-bold text-white shadow-md sm:h-11 sm:w-11 sm:text-xl">
              Mp
            </div>

            <h1 className="hidden text-xl font-extrabold sm:block lg:text-2xl">
              <span className="text-blue-500">Market</span>
              <span className="text-orange-500">Place</span>
            </h1>
          </Link>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          <Link
            href="/customer/cart"
            className="relative flex items-center gap-1 rounded-full bg-orange-50 px-3 py-2 text-sm font-medium text-orange-600 transition hover:bg-orange-100 sm:gap-2 sm:px-4"
          >
            🛒
            <span className="hidden sm:inline">Cart</span>
            {cartCount > 0 && (
              <Badge className="bg-orange-500 text-white">{cartCount}</Badge>
            )}
          </Link>

          <Link
            href="/profile"
            className="hidden max-w-[120px] truncate rounded-full bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 md:block"
          >
            👤 {userName}
          </Link>

          <Button
            size="sm"
            onClick={handleSignOut}
            className="rounded-full bg-emerald-600 px-3 text-white hover:bg-emerald-700 sm:px-4"
          >
            <span className="hidden sm:inline">Sign Out</span>
            <span className="sm:hidden">Exit</span>
          </Button>
        </div>

        {/* Navigation */}
        <nav className="order-3 flex w-full gap-2 overflow-x-auto pt-2 scrollbar-hide md:order-none md:w-auto md:items-center md:gap-5 md:overflow-visible md:pt-0">
          <Link
            href="/customer"
            className="whitespace-nowrap rounded-full px-3 py-2 font-medium text-gray-600 transition hover:bg-emerald-50 hover:text-emerald-600"
          >
            🛍 Browse
          </Link>

          <Link
            href="/customer/orders"
            className="whitespace-nowrap rounded-full px-3 py-2 font-medium text-gray-600 transition hover:bg-emerald-50 hover:text-emerald-600"
          >
            📦 My Orders
          </Link>

          <Link
            href="/customer/addresses"
            className="whitespace-nowrap rounded-full px-3 py-2 font-medium text-gray-600 transition hover:bg-emerald-50 hover:text-emerald-600"
          >
            📍 Addresses
          </Link>
        </nav>
      </div>
    </header>
  );
}
