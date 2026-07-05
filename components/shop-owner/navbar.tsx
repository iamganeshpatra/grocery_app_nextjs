"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export function ShopOwnerNavbar({ userName }: { userName: string }) {
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    toast.success("Signed out");
    router.push("/signin");
  }

  return (
    <header className="sticky top-0 z-50 border-b border-green-100 bg-white shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        {/* Left */}
        <div className="flex items-center gap-3 sm:gap-8">
          <Link href="/shop-owner" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-orange-500 text-xl shadow-md">
              Mp
            </div>

            <h1 className="text-xl font-extrabold tracking-wide">
              <span className="text-blue-500">Market</span>
              <span className="text-orange-500">Place</span>
            </h1>
          </Link>

          <Link
            href="/shop-owner"
            className="hidden rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-emerald-50 hover:text-emerald-600 sm:block"
          >
            My Shops
          </Link>
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">
          <Link
            href="/profile"
            className="max-width: 120px; truncate rounded-full bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
          >
            👤 {userName}
          </Link>

          <Button
            onClick={handleSignOut}
            className="rounded-full bg-orange-500 px-5 text-white hover:bg-orange-600"
          >
            Sign Out
          </Button>
        </div>
      </div>
    </header>
  );
}
