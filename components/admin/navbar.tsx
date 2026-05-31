"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { label: "Dashboard", href: "/admin" },
  { label: "Catalog", href: "/admin/products" },
  { label: "Shop Owners", href: "/admin/shop-owners" },
  { label: "Users", href: "/admin/users" },
  { label: "Returns", href: "/admin/returns" },
];

export function AdminNavbar({ userName }: { userName: string }) {
  const router = useRouter();
  const pathname = usePathname();

  async function handleSignOut() {
    await signOut();
    toast.success("Signed out");
    router.push("/signin");
  }

  return (
    <header className="border-b bg-white sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Link href="/admin" className="font-semibold text-lg mr-4">
            ⚙️ Admin
          </Link>
          {links.map((l) => {
            const active =
              l.href === "/admin"
                ? pathname === l.href
                : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "px-3 py-2 text-sm rounded-md transition-colors",
                  active
                    ? "bg-muted font-medium"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/profile"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {userName}
          </Link>
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            Sign Out
          </Button>
        </div>
      </div>
    </header>
  );
}
