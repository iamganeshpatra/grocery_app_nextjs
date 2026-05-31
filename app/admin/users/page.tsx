import { prisma } from "@/lib/db";
import { UsersTable } from "./components/users-table";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string }>;
}) {
  const { q = "", role = "" } = await searchParams;

  const users = await prisma.user.findMany({
    where: {
      AND: [
        role
          ? {
              role: role as
                | "SUPER_ADMIN"
                | "SHOP_OWNER"
                | "SHOP_MANAGER"
                | "CUSTOMER",
            }
          : {},
        q.trim()
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
              ],
            }
          : {},
      ],
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Users</h1>
      <UsersTable
        initialUsers={users.map((u) => ({
          ...u,
          createdAt: u.createdAt.toISOString(),
        }))}
        query={q}
        role={role}
      />
    </div>
  );
}
