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
    <header className="border-b bg-white sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/customer" className="font-semibold text-lg">
            🛒 Grocery Market
          </Link>
          <Link
            href="/customer"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Browse
          </Link>
          <Link
            href="/customer/orders"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            My Orders
          </Link>
          <Link
            href="/customer/addresses"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Addresses
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/customer/cart"
            className="relative text-sm hover:text-foreground flex items-center gap-1"
          >
            Cart
            {cartCount > 0 && (
              <Badge className="bg-foreground text-background h-5 min-w-5 px-1 justify-center">
                {cartCount}
              </Badge>
            )}
          </Link>
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
