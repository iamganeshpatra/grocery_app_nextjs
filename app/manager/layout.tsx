import { ManagerNavbar } from "@/components/manager/navbar";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "SHOP_MANAGER")
    redirect("/unauthorized");

  return (
    <div className="min-h-screen flex flex-col">
      <ManagerNavbar userName={session.user.name} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
