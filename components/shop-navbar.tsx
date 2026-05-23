import Link from "next/link";

import { prisma } from "@/lib/db";

const ShopNavbar = async ({ shopId }: { shopId: string }) => {
  const shop = await prisma.shop.findUnique({
    where: {
      id: shopId,
    },
  });

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        {/* LEFT */}
        <div className="flex items-center gap-4">
          {/* LOGO */}
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-100 text-2xl">
            🏪
          </div>

          {/* SHOP INFO */}
          <div>
            <h1 className="text-xl font-bold uppercase tracking-wide text-gray-800">
              {shop?.name}
            </h1>

            <p className="text-sm text-gray-500">{shop?.category}</p>
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-3">
          <Link
            href={`/shop/${shopId}`}
            className="rounded-xl px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
          >
            Home
          </Link>

          <Link
            href={`/shop/${shopId}/about`}
            className="rounded-xl px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
          >
            About
          </Link>

          <Link
            href={`/shop-owner/create-shop/${shopId}`}
            className="rounded-2xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700"
          >
            Manage Products
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default ShopNavbar;
