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
  if (sessionUser.role !== "USER") {
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
      userId: sessionUser.id,
    },
  });

  return (
    <div className="min-h-screen bg-[#f5f5f5] pb-24">
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
                      <h2 className="font-semibold text-gray-800 text-sm sm:text-base line-clamp-2 min-h-10">
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
                          userId={sessionUser.id}
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
