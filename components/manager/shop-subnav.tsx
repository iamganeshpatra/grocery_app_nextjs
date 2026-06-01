"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Products", href: "/products" },
  { label: "Orders", href: "/orders" },
];

export function ManagerShopSubNav({
  shopId,
  shopName,
}: {
  shopId: string;
  shopName: string;
}) {
  const pathname = usePathname();
  const base = `/manager/${shopId}`;

  return (
    <div className="border-b bg-muted/30">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center gap-1 pt-3">
          <Link
            href="/manager"
            className="text-sm text-muted-foreground hover:text-foreground mr-3"
          >
            ← All Shops
          </Link>
          <span className="text-sm font-semibold mr-4">{shopName}</span>

          {tabs.map((tab) => {
            const href = `${base}${tab.href}`;
            const isActive = pathname.startsWith(href);
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
        </div>
      </div>
    </div>
  );
}
