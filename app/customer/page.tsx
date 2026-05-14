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
      {/* 🔥 TOP HEADER */}
      <div className="sticky top-0 z-50 bg-white shadow-sm border-b">
        <div className="px-4 sm:px-6 py-4">
          {/* TITLE */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-3xl font-bold text-[#0f172a]">
                JioMart Grocery
              </h1>

              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                Fresh groceries delivered in minutes 🚚
              </p>
            </div>

            {/* DELIVERY BADGE */}
            <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs sm:text-sm font-medium">
              Fast Delivery
            </div>
          </div>

          {/* SEARCH BAR UI */}
          <div className="mt-4">
            <div className="bg-[#f3f4f6] rounded-2xl px-4 py-3 flex items-center gap-2 border">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>

              <input
                type="text"
                placeholder="Search groceries, fruits, vegetables..."
                className="bg-transparent outline-none w-full text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* HERO BANNER */}
      <div className="px-4 sm:px-6 mt-4">
        <div className="bg-gradient-to-r from-green-600 to-green-500 rounded-3xl p-5 sm:p-8 text-white shadow-md">
          <h1 className="text-2xl sm:text-4xl font-bold leading-tight">
            Fresh Grocery
            <br />
            Delivered Fast 🚚
          </h1>

          <p className="mt-2 text-sm sm:text-base text-green-100">
            Fruits, vegetables & daily essentials at best prices
          </p>

          <button className="mt-4 bg-white text-green-700 px-5 py-2 rounded-xl text-sm sm:text-base font-semibold hover:scale-105 transition">
            Shop Now
          </button>
        </div>
      </div>

      {/* CONTENT */}
      <div className="px-3 sm:px-6 mt-6">
        {/* SECTION HEADER */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
              Popular Products
            </h2>

            <p className="text-xs sm:text-sm text-gray-500">
              Best selling grocery items
            </p>
          </div>

          <button className="text-green-600 text-sm font-semibold hover:underline">
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
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-5">
            {products.map((item) => {
              // ✅ FIND PRODUCT IN CART
              const cartItem = cartItems.find(
                (cart) => cart.productId === item.product.id,
              );

              return (
                <Card
                  key={item.product.id}
                  className="group border border-gray-200 rounded-3xl overflow-hidden bg-white hover:shadow-xl transition-all duration-300"
                >
                  <CardContent className="p-3 flex flex-col h-full">
                    {/* IMAGE */}
                    <div className="relative bg-[#f8fafc] rounded-2xl overflow-hidden h-32 sm:h-44">
                      {item.product.imageUrl ? (
                        <img
                          src={item.product.imageUrl}
                          alt={item.product.name}
                          className="w-full h-full object-contain p-3 group-hover:scale-105 transition duration-300"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                          No Image
                        </div>
                      )}

                      {/* CATEGORY */}
                      <div className="absolute top-2 left-2">
                        <Badge className="bg-white text-green-700 border border-green-200 hover:bg-white text-[10px] sm:text-xs rounded-full shadow-sm">
                          {item.product.category}
                        </Badge>
                      </div>
                    </div>

                    {/* DETAILS */}
                    <div className="mt-3 flex flex-col flex-1">
                      {/* NAME */}
                      <h2 className="font-semibold text-gray-800 text-sm sm:text-base line-clamp-2 min-h-[40px]">
                        {item.product.name}
                      </h2>

                      {/* BRAND */}
                      <p className="text-xs text-gray-500 mt-1">
                        {item.product.brand || "Fresh Grocery"}
                      </p>

                      {/* QUANTITY */}
                      <p className="text-xs sm:text-sm text-gray-400 mt-1">
                        {item.product.quantity}
                      </p>

                      {/* PRICE */}
                      <div className="mt-3">
                        <p className="text-lg sm:text-xl font-bold text-green-600">
                          ₹{item.product.price}
                        </p>

                        <p className="text-[10px] text-gray-400">
                          Inclusive of all taxes
                        </p>
                      </div>

                      {/* CART */}
                      <div className="mt-4">
                        <AddAndRemoveCart
                          userId={user.id}
                          productId={item.product.id}
                          quantity={cartItem?.quantity || 0}
                        />
                      </div>
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
