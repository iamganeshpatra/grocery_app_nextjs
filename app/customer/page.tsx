import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AddAndRemoveCart from "@/addAndRemoveCart";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

const CustomerDashboardPage = async () => {
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

  const products = await prisma.product.findMany();

  return (
    <div className="min-h-screen bg-gray-100 pb-10">

      {/* Hero Section */}
      <div className="bg-green-600 text-white px-4 sm:px-6 py-8 sm:py-10">

        <h1 className="text-2xl sm:text-3xl font-bold leading-tight">
          Fresh Groceries Delivered 🚚
        </h1>

        <p className="mt-2 text-sm sm:text-base text-green-100">
          Daily essentials at best prices
        </p>

      </div>

      <div className="p-4 sm:p-6">

        {/* Top Heading */}
        <div className="flex items-center justify-between mb-5">

          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
            Popular Products
          </h2>

          <button className="text-sm sm:text-base text-green-600 font-medium hover:underline">
            View All
          </button>

        </div>

        {/* Empty State */}
        {products.length === 0 ? (

          <div className="flex items-center justify-center h-[50vh]">

            <div className="bg-white rounded-3xl shadow-sm p-8 text-center">

              <p className="text-gray-500 text-lg">
                No Products Available
              </p>

            </div>

          </div>

        ) : (

          /* Responsive Product Grid */
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-5">

            {products.map((item) => (

              <Card
                key={item.id}
                className="rounded-2xl border-0 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white overflow-hidden"
              >

                <CardContent className="p-3 flex flex-col gap-3">

                  {/* Product Image */}
                  <div className="w-full h-32 sm:h-40 bg-gray-100 rounded-xl overflow-hidden">

                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                        No Image
                      </div>
                    )}

                  </div>

                  {/* Category */}
                  <Badge className="w-fit bg-green-100 text-green-700 hover:bg-green-100 text-[10px] sm:text-xs">

                    {item.category}

                  </Badge>

                  {/* Name + Brand */}
                  <div className="flex items-start justify-between gap-2">

                    {/* Left */}
                    <h2 className="font-semibold text-gray-800 text-sm sm:text-base line-clamp-2">

                      {item.name}

                    </h2>

                    {/* Right */}
                    <span className="text-[10px] sm:text-xs bg-gray-100 px-2 py-1 rounded-md text-gray-600 whitespace-nowrap">

                      {item.brand || "Fresh"}

                    </span>

                  </div>

                  {/* Quantity */}
                  <p className="text-xs sm:text-sm text-gray-500">

                    {item.quantity}

                  </p>

                  {/* Price + Cart Buttons */}
                  <div className="flex items-center justify-between mt-2 gap-2">

                    {/* Price */}
                    <p className="text-base sm:text-lg font-bold text-green-600">

                      ₹{item.price}

                    </p>

                    {/* Add Remove */}
                    <AddAndRemoveCart
                      userId={user.id}
                      productId={item.id}
                      quantity={1}
                    />

                  </div>

                </CardContent>

              </Card>

            ))}

          </div>

        )}

      </div>

    </div>
  );
};

export default CustomerDashboardPage;