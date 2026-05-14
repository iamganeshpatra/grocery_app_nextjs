import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AddAndRemoveCart from "@/addAndRemoveCart";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

const CustomerDashboardPage = async () => {
  // ✅ SESSION
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const sessionUser = session?.user;

  if (!sessionUser) {
    redirect("/signin");
  }

  // ✅ GET USER
  const user = await prisma.user.findUnique({
    where: {
      id: sessionUser.id,
    },
  });

  if (!user) {
    redirect("/signin");
  }

  // ✅ ONLY USER ACCESS
  if (user.role !== "USER") {
    redirect("/signin");
  }

  // ✅ SHOP PRODUCTS
  const products = await prisma.shopProduct.findMany({
    include: {
      product: true,
    },
  });

  // ✅ USER CART ITEMS
  const cartItems = await prisma.cart.findMany({
    where: {
      userId: user.id,
    },
  });

  return (
    <div className="min-h-screen bg-[#f5f5f5] pb-24">
      {/* HERO */}
      <div className="bg-gradient-to-r from-green-600 to-green-500 text-white px-4 sm:px-6 py-8 rounded-b-[30px] shadow-md">
        <h1 className="text-2xl sm:text-4xl font-bold leading-tight">
          Groceries Delivered Fast 🚚
        </h1>

        <p className="mt-2 text-sm sm:text-base text-green-100">
          Fresh vegetables, fruits & daily essentials
        </p>
      </div>

      {/* CONTENT */}
      <div className="p-4 sm:p-6">
        {/* HEADING */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
            Popular Products
          </h2>

          <button className="text-green-600 text-sm sm:text-base font-medium hover:underline">
            View All
          </button>
        </div>

        {/* EMPTY */}
        {products.length === 0 ? (
          <div className="flex items-center justify-center h-[50vh]">
            <div className="bg-white rounded-3xl shadow-sm p-8 text-center">
              <p className="text-lg text-gray-500">No Products Available</p>
            </div>
          </div>
        ) : (
          /* PRODUCTS GRID */
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {products.map((item) => {
              // ✅ FIND PRODUCT IN CART
              const cartItem = cartItems.find(
                (cart) => cart.productId === item.product.id,
              );

              return (
                <Card
                  key={item.product.id}
                  className="border-0 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white"
                >
                  <CardContent className="p-3 flex flex-col gap-3">
                    {/* IMAGE */}
                    <div className="w-full h-32 sm:h-44 bg-gray-100 rounded-2xl overflow-hidden">
                      {item.product.imageUrl ? (
                        <img
                          src={item.product.imageUrl}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                          No Image
                        </div>
                      )}
                    </div>

                    {/* CATEGORY */}
                    <Badge className="w-fit bg-green-100 text-green-700 hover:bg-green-100 text-[10px] sm:text-xs rounded-full">
                      {item.product.category}
                    </Badge>

                    {/* NAME + BRAND */}
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="font-semibold text-gray-800 text-sm sm:text-base line-clamp-2">
                        {item.product.name}
                      </h2>

                      <span className="text-[10px] sm:text-xs bg-gray-100 px-2 py-1 rounded-md text-gray-600 whitespace-nowrap">
                        {item.product.brand || "Fresh"}
                      </span>
                    </div>

                    {/* QUANTITY */}
                    <p className="text-xs sm:text-sm text-gray-500">
                      {item.product.quantity}
                    </p>

                    {/* PRICE + CART */}
                    <div className="flex items-center justify-between mt-2 gap-2">
                      {/* PRICE */}
                      <p className="text-base sm:text-lg font-bold text-green-600">
                        ₹{item.product.price}
                      </p>

                      {/* CART BUTTON */}
                      <AddAndRemoveCart
                        userId={user.id}
                        productId={item.product.id}
                        quantity={cartItem?.quantity || 0}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerDashboardPage;
