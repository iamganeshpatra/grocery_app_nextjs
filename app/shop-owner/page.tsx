import Link from "next/link";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import DeleteShopButton from "@/components/shop-owner/deleteShop";

const ShopOwnerDashboardPage = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const sessionUser = session?.user;

  if (!sessionUser) redirect("/signin");

  if (sessionUser.role !== "SHOP_OWNER") redirect("/signin");

  const shops = await prisma.shop.findMany({
    where: { ownerId: sessionUser.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-6">
      {/* HEADER */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Seller Dashboard 🏪
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your shops, products and business
          </p>
        </div>

        <Link
          href="/shop-owner/create-shop"
          className="rounded-2xl bg-green-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-green-700 hover:scale-105"
        >
          + Create New Shop
        </Link>
      </div>

      {/* SHOPS */}
      {shops.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {shops.map((shop) => (
            <div
              key={shop.id}
              className="group relative rounded-3xl border bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              {/* DELETE BUTTON */}
              <div className="absolute right-4 top-4">
                <DeleteShopButton shopId={shop.id} />
              </div>

              {/* SHOP LINK CONTENT */}
              <Link href={`/shop-owner/${shop.id}`}>
                <div>
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-100 text-2xl shadow-sm">
                    🏪
                  </div>

                  <h2 className="mt-4 text-lg font-bold text-gray-900 group-hover:text-green-600">
                    {shop.name}
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">{shop.category}</p>

                  <div className="mt-5 text-sm font-medium text-green-600">
                    Open Shop →
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed bg-white p-12 text-center">
          <h2 className="text-lg font-semibold text-gray-800">
            No Shops Found
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Start by creating your first shop
          </p>

          <Link
            href="/shop-owner/create-shop"
            className="mt-5 inline-block rounded-2xl bg-green-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-green-700"
          >
            Create Shop
          </Link>
        </div>
      )}
    </div>
  );
};

export default ShopOwnerDashboardPage;
