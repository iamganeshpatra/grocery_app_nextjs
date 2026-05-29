"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Dashboard", href: "" },
  { label: "Products", href: "/manage-products" },
  { label: "Managers", href: "/create-manager" },
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
    <div className="border-b bg-muted/30">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center gap-1 pt-3">
          <Link
            href="/shop-owner"
            className="text-sm text-muted-foreground hover:text-foreground mr-3"
          >
            ← All Shops
          </Link>
          <span className="text-sm font-semibold mr-4">{shopName}</span>

          {tabs.map((tab) => {
            const href = `${base}${tab.href}`;
            const isActive =
              tab.href === "" ? pathname === base : pathname.startsWith(href);

            return (
              <Link
                key={tab.href}
                href={href}
                className={cn(
                  "px-3 py-2 text-sm border-b-2 transition-colors",
                  isActive
                    ? "border-foreground font-medium text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
              </Link>
            );
          })}

          <Link
            href={`${base}/edit`}
            className={cn(
              "px-3 py-2 text-sm border-b-2 transition-colors ml-auto",
              pathname === `${base}/edit`
                ? "border-foreground font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            Edit Shop
          </Link>
        </div>
      </div>
    </div>
  );
}
