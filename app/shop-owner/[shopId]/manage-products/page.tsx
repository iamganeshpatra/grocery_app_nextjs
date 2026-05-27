import { prisma } from "@/lib/db";
import {
  addShopProduct,
  updateShopProduct,
} from "@/actions/shop-product.action";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

import { Package, ShoppingCart, Boxes, Plus } from "lucide-react";

import AddProductsFromList from "@/components/addProductsFromList";

type Props = {
  params: Promise<{
    shopId: string;
  }>;
};

const ManageProducts = async ({ params }: Props) => {
  const { shopId } = await params;

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

  // ALL PRODUCTS
  const products = await prisma.product.findMany({
    orderBy: {
      name: "asc",
    },
  });

  // SHOP PRODUCTS
  const shopProducts = await prisma.shopProduct.findMany({
    where: {
      shopId,
    },
    include: {
      product: true,
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-700 via-white to-green-50 p-6">
      <div className="mx-auto max-w-6xl">
        {/* HEADER */}
        <div className="mb-8 overflow-hidden rounded-3xl bg-gradient-to-r from-orange-500 to-green-500 p-8 shadow-xl">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-3">
                <div className="rounded-2xl bg-white/20 p-3 backdrop-blur-sm">
                  <ShoppingCart className="h-8 w-8 text-white" />
                </div>

                <h1 className="text-4xl font-bold text-white">
                  Manage Products
                </h1>
              </div>

              <p className="max-w-xl text-sm text-orange-100">
                Add products, manage inventory and update your shop stock easily
                from one dashboard.
              </p>
            </div>

            {/* ADD PRODUCT BUTTON */}
            <Link
              href={`/shop-owner/${shopId}/manage-products/add-products`}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 text-sm font-semibold text-orange-600 shadow-lg transition hover:scale-105 hover:bg-orange-50"
            >
              <Plus className="h-5 w-5" />
              Add Product
            </Link>
          </div>
        </div>

        {/* STATS */}
        <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-3">
          {/* TOTAL PRODUCTS */}
          <div className="rounded-3xl border border-orange-100 bg-white p-6 shadow-md transition hover:-translate-y-1 hover:shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Total Products
                </p>

                <h2 className="mt-3 text-4xl font-bold text-gray-900">
                  {products.length}
                </h2>
              </div>

              <div className="rounded-2xl bg-orange-100 p-4">
                <Package className="h-8 w-8 text-orange-600" />
              </div>
            </div>
          </div>

          {/* PRODUCTS IN SHOP */}
          <div className="rounded-3xl border border-green-100 bg-white p-6 shadow-md transition hover:-translate-y-1 hover:shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Products In Shop
                </p>

                <h2 className="mt-3 text-4xl font-bold text-green-600">
                  {shopProducts.length}
                </h2>
              </div>

              <div className="rounded-2xl bg-green-100 p-4">
                <ShoppingCart className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </div>

          {/* REMAINING PRODUCTS */}
          <div className="rounded-3xl border border-blue-100 bg-white p-6 shadow-md transition hover:-translate-y-1 hover:shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Remaining Products
                </p>

                <h2 className="mt-3 text-4xl font-bold text-blue-600">
                  {products.length - shopProducts.length}
                </h2>
              </div>

              <div className="rounded-2xl bg-blue-100 p-4">
                <Boxes className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        {/* PRODUCT LIST */}
        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-lg">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-xl bg-orange-100 p-3">
              <Package className="h-6 w-6 text-orange-600" />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Product Inventory
              </h2>

              <p className="text-sm text-gray-500">
                Manage stock and shop products
              </p>
            </div>
          </div>

          <AddProductsFromList
            shopId={shopId}
            products={products}
            shopProducts={shopProducts}
            addProduct={addShopProduct}
            updateProduct={updateShopProduct}
          />
        </div>
      </div>
    </div>
  );
};

export default ManageProducts;
