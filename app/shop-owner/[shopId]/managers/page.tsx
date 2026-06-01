import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ManagersPanel } from "./components/managers-panel";

export default async function ShopManagersPage({
  params,
}: {
  params: Promise<{ shopId: string }>;
}) {
  const { shopId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/signin");

  const shop = await prisma.shop.findFirst({
    where: { id: shopId, ownerId: session.user.id },
  });
  if (!shop) notFound();

  const managers = await prisma.shopManager.findMany({
    where: { shopId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Managers</h1>
      <ManagersPanel shopId={shopId} initialManagers={managers} />
    </div>
  );
}
