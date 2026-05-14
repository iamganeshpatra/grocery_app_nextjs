import { prisma } from "@/lib/db";
import AddProductsFromList from "./add-products-from-list";
import {
  addShopProduct,
  updateShopProduct,
} from "@/actions/shop-product.action";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const ManageProducts = async () => {
  const userSession = await auth.api.getSession({
    headers: await headers(),
  });

  const products = await prisma.product.findMany();
  const shopProducts = await prisma.shopProduct.findMany({
    include: {
      product: true,
    },
    where: {
      userId: userSession?.user.id,
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
