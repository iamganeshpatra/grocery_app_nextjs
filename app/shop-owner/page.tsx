
import Link from "next/link";

import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import DeleteShopButton from "@/components/deleteShop";

const ShopOwnerDashboardPage = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const sessionUser = session?.user;

  if (!sessionUser) {
    redirect("/signin");
  }

  if (sessionUser.role !== "SHOP_OWNER") {
    redirect("/signin");
  }

  const shops = await prisma.shop.findMany({
    where: {
      ownerId: sessionUser.id,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
  return (
    <div className="min-h-screen bg-[#f5f5f5] p-4 sm:p-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
            Shop Owner Dashboard
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            Manage your shops, managers and products
          </p>
        </div>

        {/* CREATE SHOP */}
        <Link
          href="/shop-owner/create-shop"
          className="bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-2xl text-sm font-medium text-center transition"
        >
          + Create New Shop
        </Link>
      </div>

      {/* SHOPS */}
      {shops.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {shops.map((shop) => (
            <div
              key={shop.id}
              className="bg-white rounded-3xl shadow-sm p-5 hover:shadow-md transition border border-gray-100"
            >
              {/* CLICKABLE SHOP AREA */}
              <Link href={`/shop-owner/create-shop/${shop.id}`}>
                <div className="cursor-pointer">
                  {/* ICON */}
                  <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center text-2xl">
                    🏪
                  </div>

                  {/* SHOP INFO */}
                  <h2 className="text-lg font-bold text-gray-800 mt-4">
                    {shop.name}
                  </h2>

                  <p className="text-sm text-gray-500 mt-1">{shop.category}</p>

                  {/* ACTION */}
                  <div className="mt-5">
                    <span className="text-sm text-green-600 font-medium">
                      Open Shop →
                    </span>
                  </div>
                </div>
              </Link>

              {/* BUTTONS */}
              <div className="mt-5 flex flex-col gap-3">
                {/* ADD MANAGER */}
                <Link
                  href={`/shop-owner/shop/${shop.id}/create-manager`}
                  className="bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl text-center text-sm font-medium transition"
                >
                  Add Manager
                </Link>
                <DeleteShopButton shopId={shop.id} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* EMPTY STATE */
        <div className="bg-white rounded-3xl p-10 text-center shadow-sm border border-dashed border-gray-300">
          <h2 className="text-lg font-semibold text-gray-700">
            No Shops Created
          </h2>

          <p className="text-sm text-gray-500 mt-2">
            Start by creating your first shop
          </p>

          <Link
            href="/shop-owner/create-shop"
            className="inline-block mt-5 bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-2xl text-sm font-medium transition"
          >
            Create Shop
          </Link>
        </div>
      )}
    </div>
  );
};

export default ShopOwnerDashboardPage;
