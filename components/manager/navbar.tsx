"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export function ManagerNavbar({ userName }: { userName: string }) {
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
          <Link href="/manager" className="font-semibold text-lg">
            🛒 Grocery Market
          </Link>
          <Link
            href="/manager"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            My Shops
          </Link>
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
