"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Dashboard", href: "" },
  { label: "Products", href: "/manage-products" },
  { label: "Orders", href: "/orders" },
  { label: "Managers", href: "/managers" },
];

export function ShopSubNav({
  shopId,
  shopName,
}: {
  shopId: string;
  shopName: string;
}) {
  const pathname = usePathname();
  const base = `/shop-owner/${shopId}`;

  return (
    <div className="sticky top-0 z-20 border-b border-green-200 bg-gradient-to-r from-green-50 via-white to-lime-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Top Row */}
        <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
          <Link
            href="/shop-owner"
            className="text-sm font-medium text-green-700 hover:text-green-900"
          >
            ← All Shops
          </Link>

          <div className="truncate rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-800">
            🛒 {shopName}
          </div>

          <Link
            href={`${base}/edit`}
            className={cn(
              "sm:ml-auto rounded-lg px-4 py-2 text-sm font-medium transition",
              pathname === `${base}/edit`
                ? "bg-amber-500 text-white"
                : "border border-amber-300 bg-white text-amber-700 hover:bg-amber-50",
            )}
          >
            ✏️ Edit Shop
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
          {tabs.map((tab) => {
            const href = `${base}${tab.href}`;

            const isActive =
              tab.href === "" ? pathname === base : pathname.startsWith(href);

            return (
              <Link
                key={tab.href}
                href={href}
                className={cn(
                  "whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition",
                  isActive
                    ? "bg-green-600 text-white shadow"
                    : "text-gray-600 hover:bg-green-100 hover:text-green-700",
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
