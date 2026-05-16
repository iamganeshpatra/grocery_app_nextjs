import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

import { Card, CardContent } from "@/components/ui/card";
import AddAndRemoveCart from "@/addAndRemoveCart";
import { redirect } from "next/navigation";
import Link from "next/link";

const CartPage = async () => {

  const session = await auth.api.getSession({
        headers: await headers(),
      });
    
      const sessionUser = session?.user;
    
      if (!sessionUser) {
        redirect("/signin");
      }
    
      // 🔥 FETCH REAL USER FROM DATABASE
      const user = await prisma.user.findUnique({
        where: {
          id: sessionUser.id,
        },
      });
    
      if (!user) {
        redirect("/signin");
      }
    
      if (user.role !== "USER") {
        redirect("/signin");
      }  
  // Get Current User Cart
  const cartItems = await prisma.cart.findMany({
    where: {
      user,
    },
    include: {
      product: true,
    },
  });

  // Subtotal
  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  // Delivery
  const delivery = subtotal > 500 ? 0 : 9;

  // Total
  const total = subtotal + delivery;

  return (
    <div className="min-h-screen bg-gray-100 pb-28">

      {/* Top Header */}
      <div className="bg-white sticky top-0 z-50 shadow-sm px-4 py-4">

        <h1 className="text-2xl font-bold text-gray-800">
          My Cart 🛒
        </h1>

        <p className="text-sm text-gray-500 mt-1">
          {cartItems.length} items added
        </p>

      </div>

      {/* Empty Cart */}
      {cartItems.length === 0 ? (

        <div className="flex items-center justify-center h-[70vh] px-4">

          <div className="bg-white rounded-3xl shadow-sm p-8 text-center w-full max-w-md">

            <h2 className="text-2xl font-bold text-gray-800">
              Your Cart is Empty
            </h2>

            <p className="text-gray-500 mt-2">
              Add some products to continue shopping
            </p>

          </div>

        </div>

      ) : (

        <div className="p-4 lg:grid lg:grid-cols-3 lg:gap-6">

          {/* LEFT SIDE PRODUCTS */}
          <div className="lg:col-span-2 space-y-4">

            {cartItems.map((item) => (

              <Card
                key={item.id}
                className="border-0 rounded-3xl shadow-sm bg-white hover:shadow-md transition-all"
              >

                <CardContent className="p-4">

                  {/* MOBILE FRIENDLY */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

                    {/* LEFT */}
                    <div className="flex gap-4">

                      {/* Product Image */}
                      <div className="w-24 h-24 min-w-[96px] rounded-2xl overflow-hidden bg-gray-100">

                        {item.product.imageUrl ? (
                          <img
                            src={item.product.imageUrl}
                            alt={item.product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-xs text-gray-400">
                            No Image
                          </div>
                        )}

                      </div>

                      {/* Product Details */}
                      <div className="flex flex-col justify-between">

                        <div>

                          <h2 className="font-semibold text-gray-800 text-base sm:text-lg line-clamp-1">
                            {item.product.name}
                          </h2>

                          <p className="text-sm text-gray-500 mt-1">
                            {item.product.quantity}
                          </p>

                          <p className="text-xs text-gray-400 mt-1">
                            {item.product.category}
                          </p>

                        </div>

                        <p className="text-green-600 font-bold text-lg mt-3">
                          ₹{item.product.price}
                        </p>

                      </div>

                    </div>

                    {/* RIGHT */}
                    <div className="flex justify-end sm:justify-center">

                      <AddAndRemoveCart
                        userId={item.userId}
                        productId={item.productId}
                        quantity={item.quantity}
                      />

                    </div>

                  </div>

                </CardContent>

              </Card>

            ))}

          </div>

          {/* RIGHT SIDE BILL */}
          <div className="mt-6 lg:mt-0">

            <div className="bg-white rounded-3xl p-5 shadow-sm lg:sticky lg:top-24">

              <h2 className="text-xl font-bold text-gray-800 mb-5">
                Price Details
              </h2>

              {/* Subtotal */}
              <div className="flex items-center justify-between mb-4">

                <span className="text-gray-600">
                  Subtotal
                </span>

                <span className="font-semibold text-gray-800">
                  ₹{subtotal}
                </span>

              </div>

              {/* Delivery */}
              <div className="flex items-center justify-between mb-4">

                <span className="text-gray-600">
                  Delivery Charge
                </span>

                <span
                  className={`font-semibold ${
                    delivery === 0
                      ? "text-green-600"
                      : "text-gray-800"
                  }`}
                >
                  {delivery === 0 ? "FREE" : `₹${delivery}`}
                </span>

              </div>

              {/* Divider */}
              <div className="border-t my-4"></div>

              {/* Total */}
              <div className="flex items-center justify-between">

                <span className="text-lg font-bold text-gray-800">
                  Total
                </span>

                <span className="text-2xl font-bold text-green-600">
                  ₹{total}
                </span>

              </div>

              {/* Checkout Button */}
              <Link href="/customer/checkout" className="w-full mt-6 bg-green-600 hover:bg-green-700 transition-all text-white py-3 rounded-2xl font-semibold text-lg">

                Proceed to Checkout

              </Link>

              {/* Free Delivery Message */}
              {subtotal < 500 && (

                <p className="text-sm text-gray-500 mt-4 text-center">

                  Add ₹{500 - subtotal} more for FREE delivery 🚚

                </p>

              )}

            </div>

          </div>

        </div>

      )}

    </div>
  );
};

export default CartPage;