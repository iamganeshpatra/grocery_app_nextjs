import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ShopOwnerNavbar } from "@/components/shop-owner/navbar";

export default async function ShopOwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "SHOP_OWNER") {
    redirect("/unauthorized");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <ShopOwnerNavbar userName={session.user.name} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
