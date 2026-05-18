import Link from "next/link";

import { prisma } from "@/lib/db";

const ShopOwnerDashboardPage = async () => {
  // logged in owner id
  const ownerId = "OWNER_ID";

  // fetch shops of owner
  const shops = await prisma.shop.findMany({
    where: {
      ownerId,
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
          className="bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-2xl text-sm font-medium text-center"
        >
          + Create New Shop
        </Link>
      </div>

      {/* SHOPS */}
      {shops.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {shops.map((shop) => (
            <Link key={shop.id} href={`/shop-owner/shop/${shop.id}`}>
              <div className="bg-white rounded-3xl shadow-sm p-5 hover:shadow-md transition cursor-pointer border border-gray-100">
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
            className="inline-block mt-5 bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-2xl text-sm font-medium"
          >
            Create Shop
          </Link>
        </div>
      )}
    </div>
  );
};

export default ShopOwnerDashboardPage;
