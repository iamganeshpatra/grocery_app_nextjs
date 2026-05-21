import { prisma } from "@/lib/db";
import {
  addShopProduct,
  updateShopProduct,
} from "@/actions/shop-product.action";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import AddProductsFromList from "@/components/addProductsFromList";

const ManageProducts = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const sessionUser = session?.user;

  // NOT LOGGED IN
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

  // ACCESS CONTROL
  const hasAccess = user.role === "SHOP_OWNER" || user.role === "SHOP_MANAGER";

  if (!hasAccess) {
    redirect("/unauthorized");
  }

  // PRODUCTS
  const products = await prisma.product.findMany();

  const shopProducts = await prisma.shopProduct.findMany({
    include: {
      product: true,
    },
    where: {
      userId: sessionUser.id,
    },
  });

  return (
    <div>
      <AddProductsFromList
        products={products}
        shopProducts={shopProducts}
        addProduct={addShopProduct}
        updateProduct={updateShopProduct}
      />
    </div>
  );
};

export default ManageProducts;
