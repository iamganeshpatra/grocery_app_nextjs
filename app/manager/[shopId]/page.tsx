import { redirect } from "next/navigation";

export default async function ManagerShopHome({
  params,
}: {
  params: Promise<{ shopId: string }>;
}) {
  const { shopId } = await params;
  redirect(`/manager/${shopId}/products`);
}
