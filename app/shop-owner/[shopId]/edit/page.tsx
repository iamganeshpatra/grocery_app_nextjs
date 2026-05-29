import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { EditShopForm } from "../components/edit-shop-form";

export default async function EditShopPage({
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

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Edit Shop</h1>
      <EditShopForm shop={shop} />
    </div>
  );
}
