import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import CreateProductClient from "./components/add-product";

type Props = {
  params: Promise<{
    shopId: string;
  }>;
};

export default async function Page({ params }: Props) {
  const { shopId } = await params;

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const sessionUser = session?.user;

  if (!sessionUser) {
    redirect("/signin");
  }

  const user = await prisma.user.findUnique({
    where: {
      id: sessionUser.id,
    },
  });

  if (!user) {
    redirect("/signin");
  }

  const hasAccess = user.role === "SHOP_OWNER" || user.role === "SHOP_MANAGER";

  if (!hasAccess) {
    redirect("/unauthorized");
  }

  return <CreateProductClient shopId={shopId} />;
}
