import CreateProductClient from "@/createProduct";
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

  // 🔥 ALWAYS GET REAL USER FROM DB
  const user = await prisma.user.findUnique({
    where: {
      id: sessionUser.id,
    },
  });

  if (!user) {
    redirect("/signin");
  }

  if (user.role !== "ADMIN") {
    redirect("/unauthorized");
  }

  return <CreateProductClient />;
}