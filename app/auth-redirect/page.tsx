import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

const ROLE_ROUTES: Record<string, string> = {
  SUPER_ADMIN: "/admin",
  SHOP_OWNER: "/shop-owner",
  SHOP_MANAGER: "/manager",
  CUSTOMER: "/customer",
};

export default async function AuthRedirectPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/signin");
  }
  if (session.user.mustChangePassword) {
    redirect("/change-password");
  }

  const role = session.user.role as string;
  const destination = ROLE_ROUTES[role] ?? "/signin";
  redirect(destination);
}
