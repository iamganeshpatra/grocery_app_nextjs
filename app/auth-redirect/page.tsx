import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

const AuthRedirectPage = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const sessionUser = session?.user;

  if (!sessionUser) {
    redirect("/signin");
  }

  // ✅ ALWAYS FETCH REAL USER FROM DB
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
  });

  if (!user) {
    redirect("/signin");
  }

  if (user.role === "SHOP_OWNER") {
    redirect("/shop-owner");
  }

  redirect("/customer");
};

export default AuthRedirectPage;