import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { CustomerNavbar } from "@/components/customer/navbar";

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "CUSTOMER") redirect("/unauthorized");

  const cartCount = await prisma.cart.count({
    where: { userId: session.user.id },
  });

  return (
    <div className="min-h-screen flex flex-col">
      <CustomerNavbar userName={session.user.name} cartCount={cartCount} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
