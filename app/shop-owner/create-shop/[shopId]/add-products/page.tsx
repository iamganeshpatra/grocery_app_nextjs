import CreateProductClient from "@/components/create-products";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function Page() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const sessionUser = session?.user;

  if (!sessionUser) {
    redirect("/signin");
  }

  // GET USER
  const user = await prisma.user.findUnique({
    where: {
      id: sessionUser.id,
    },
  });

  if (!user) {
    redirect("/signin");
  }

  // ONLY SHOP_OWNER & SHOP_MANAGER CAN ACCESS
  const hasAccess = user.role === "SHOP_OWNER" || user.role === "SHOP_MANAGER";

  if (!hasAccess) {
    redirect("/unauthorized");
  }

  return <CreateProductClient />;
}
