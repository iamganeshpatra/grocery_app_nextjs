import Link from "next/link";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
  Package,
  AlertTriangle,
  XCircle,
  Store,
  Users,
  ShieldCheck,
} from "lucide-react";

type Props = {
  params: Promise<{
    shopId: string;
  }>;
};

const ShopDetailsPage = async ({ params }: Props) => {
  const { shopId } = await params;

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const user = session?.user;

  if (!user) {
    return notFound();
  }

  const shop = await prisma.shop.findUnique({
    where: {
      id: shopId,
    },
    include: {
      shopProducts: {
        include: {
          product: true,
        },
      },
      shopManagers: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!shop) {
    return notFound();
  }

  // STATS
  const totalProducts = shop.shopProducts.length;

  const lowStockProducts = shop.shopProducts.filter(
    (item) => item.stock > 0 && item.stock <= 5,
  ).length;

  const outOfStockProducts = shop.shopProducts.filter(
    (item) => item.stock === 0,
  ).length;

  // LOW STOCK ITEMS
  const lowStockItems = shop.shopProducts.filter(
    (item) => item.stock > 0 && item.stock <= 5,
  );

  // OUT OF STOCK ITEMS
  const outOfStockItems = shop.shopProducts.filter((item) => item.stock === 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-green-50 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          {/* LEFT SIDE */}
          <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
            {/* SHOP HEADER */}
            <div className="flex items-center gap-5">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-green-100 to-emerald-50 shadow-sm">
                <Store className="h-10 w-10 text-green-700" />
              </div>

              <div>
                <h1 className="text-4xl font-black tracking-tight text-gray-800">
                  {shop.name}
                </h1>

                <p className="mt-2 text-base font-medium text-gray-500">
                  {shop.category}
                </p>
              </div>
            </div>

            {/* STATS */}
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {/* TOTAL PRODUCTS */}
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <div className="flex items-center justify-between">
                  <Package className="h-5 w-5 text-gray-700" />

                  <span className="text-2xl font-black text-gray-800">
                    {totalProducts}
                  </span>
                </div>

                <p className="mt-3 text-sm font-semibold text-gray-600">
                  Total Products
                </p>
              </div>

              {/* LOW STOCK */}
              <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4">
                <div className="flex items-center justify-between">
                  <AlertTriangle className="h-5 w-5 text-yellow-700" />

                  <span className="text-2xl font-black text-yellow-700">
                    {lowStockProducts}
                  </span>
                </div>

                <p className="mt-3 text-sm font-semibold text-yellow-700">
                  Low Stock
                </p>
              </div>

              {/* OUT OF STOCK */}
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                <div className="flex items-center justify-between">
                  <XCircle className="h-5 w-5 text-red-700" />

                  <span className="text-2xl font-black text-red-700">
                    {outOfStockProducts}
                  </span>
                </div>

                <p className="mt-3 text-sm font-semibold text-red-700">
                  Out Of Stock
                </p>
              </div>
            </div>

            {/* PRODUCT ALERTS */}
            <div className="mt-10 grid gap-6 lg:grid-cols-2">
              {/* LOW STOCK */}
              <div className="rounded-3xl border border-yellow-100 bg-yellow-50 p-6 shadow-sm">
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-700" />

                    <h2 className="text-lg font-bold text-yellow-800">
                      Low Stock
                    </h2>
                  </div>

                  <span className="rounded-full bg-yellow-200 px-3 py-1 text-xs font-bold text-yellow-800">
                    {lowStockItems.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {lowStockItems.length > 0 ? (
                    lowStockItems.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-yellow-100 bg-white p-4 transition hover:shadow-md"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-gray-800">
                              {item.product.name}
                            </h3>

                            <p className="mt-1 text-xs text-yellow-700">
                              Running low on stock
                            </p>
                          </div>

                          <div className="rounded-full bg-yellow-100 px-3 py-1 text-sm font-bold text-yellow-700">
                            {item.stock} left
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl bg-white p-4 text-sm text-yellow-700">
                      No low stock products
                    </div>
                  )}
                </div>
              </div>

              {/* OUT OF STOCK */}
              <div className="rounded-3xl border border-red-100 bg-red-50 p-6 shadow-sm">
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-red-700" />

                    <h2 className="text-lg font-bold text-red-800">
                      Out Of Stock
                    </h2>
                  </div>

                  <span className="rounded-full bg-red-200 px-3 py-1 text-xs font-bold text-red-800">
                    {outOfStockItems.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {outOfStockItems.length > 0 ? (
                    outOfStockItems.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-red-100 bg-white p-4 transition hover:shadow-md"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-gray-800">
                              {item.product.name}
                            </h3>

                            <p className="mt-1 text-xs text-red-600">
                              Refill required immediately
                            </p>
                          </div>

                          <div className="rounded-full bg-red-100 px-3 py-1 text-sm font-bold text-red-700">
                            Empty
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl bg-white p-4 text-sm text-red-700">
                      No out of stock products
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE */}
          <div className="space-y-6">
            {/* MANAGERS */}
            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-700" />

                  <h2 className="text-xl font-bold text-gray-800">Managers</h2>
                </div>

                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                  {shop.shopManagers.length}
                </span>
              </div>

              <div className="mt-6 space-y-3">
                {shop.shopManagers.length > 0 ? (
                  shop.shopManagers.map((manager) => (
                    <div
                      key={manager.id}
                      className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
                        {manager.user.name.charAt(0).toUpperCase()}
                      </div>

                      <div>
                        <h3 className="font-semibold text-gray-800">
                          {manager.user.name}
                        </h3>

                        <p className="text-sm text-gray-500">Shop Manager</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-gray-200 p-4 text-sm text-gray-500">
                    No managers assigned yet
                  </div>
                )}
              </div>
            </div>

            {/* ACTIONS */}
            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-gray-800">Shop Actions</h2>

              <p className="mt-2 text-sm text-gray-500">
                Manage your grocery store
              </p>

              <div className="mt-8 space-y-4">
                {user.role === "SHOP_OWNER" && (
                  <Link
                    href={`/shop-owner/create-shop/${shopId}/create-manager`}
                    className="flex items-center justify-center rounded-2xl bg-blue-600 px-5 py-4 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    Create Manager
                  </Link>
                )}

                <Link
                  href={`/shop-owner/create-shop/${shopId}/manage-products`}
                  className="flex items-center justify-center rounded-2xl bg-orange-600 px-5 py-4 text-sm font-semibold text-white transition hover:bg-orange-700"
                >
                  Manage Products
                </Link>
              </div>

              {/* STATUS */}
              <div className="mt-10 rounded-2xl bg-green-50 p-5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-green-700" />

                  <p className="text-sm font-medium text-green-700">
                    Store Status
                  </p>
                </div>

                <h3 className="mt-3 text-2xl font-black text-green-700">
                  Active
                </h3>

                <p className="mt-2 text-xs text-green-600">
                  Your grocery business is running smoothly
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShopDetailsPage;
