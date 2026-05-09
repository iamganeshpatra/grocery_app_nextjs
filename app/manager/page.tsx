import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import ManagerDashboard from "@/managerDashboard";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

const ManagerDashboardPage = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const sessionUser = session?.user;

  if (!sessionUser) {
    redirect("/signin");
  }

  // 🔥 FETCH REAL USER FROM DATABASE
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

  const products = await prisma.product.findMany();

  return <ManagerDashboard products={products} />;
};

export default ManagerDashboardPage;