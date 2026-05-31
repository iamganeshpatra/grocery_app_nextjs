import { AdminNavbar } from "@/components/admin/navbar";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "SUPER_ADMIN")
    redirect("/unauthorized");

  return (
    <div className="min-h-screen flex flex-col">
      <AdminNavbar userName={session.user.name} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
