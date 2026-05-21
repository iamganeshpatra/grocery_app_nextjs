import Link from "next/link";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

type Props = {
  params: Promise<{
    shopId: string;
  }>;
};

const ShopDetailsPage = async ({ params }: Props) => {
  const { shopId } = await params;

  // GET SESSION
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const user = session?.user;

  if (!user) {
    return notFound();
  }

  // GET SHOP
  const shop = await prisma.shop.findUnique({
    where: {
      id: shopId,
    },
  });

  if (!shop) {
    return notFound();
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-sm p-6">
        {/* SHOP INFO */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center text-3xl">
            🏪
          </div>

          <div>
            <h1 className="text-3xl font-bold text-gray-800">{shop.name}</h1>

            <p className="text-gray-500 mt-1">{shop.category}</p>
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* ONLY SHOP OWNER CAN SEE */}
          {user.role === "SHOP_OWNER" && (
            <Link
              href={`/shop-owner/create-shop/${shopId}/create-manager`}
              className="bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-2xl text-center font-medium transition"
            >
              Create Manager
            </Link>
          )}

          {/* ADD PRODUCT */}
          <Link
            href={`/shop-owner/create-shop/${shopId}/add-products`}
            className="bg-green-600 hover:bg-green-700 text-white py-3 rounded-2xl text-center font-medium transition"
          >
            Add Product
          </Link>

          {/* MANAGE PRODUCTS */}
          <Link
            href={`/shop-owner/create-shop/${shopId}/manage-products`}
            className="bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-2xl text-center font-medium transition"
          >
            Manage Products
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ShopDetailsPage;
