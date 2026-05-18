import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import CreateShopPage from "@/components/createShop";

const CreateShop = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // not logged in
  if (!session?.user) {
    redirect("/signin");
  }

  // not shop owner
  if (session.user.role !== "SHOP_OWNER") {
    redirect("/");
  }

  return <CreateShopPage />;
};

export default CreateShop;
