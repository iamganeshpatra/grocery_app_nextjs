"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type ShopProductType = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  imageUrl?: string | null;
  category: string;
  stock: number;
  brand?: string | null;
};

const ShopProductsDashboard = ({
  products,
}: {
  products: ShopProductType[];
}) => {
  return (
    <div className="p-6">
      {/* Heading */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Shop Products</h1>

        <p className="text-gray-500 mt-1">Manage all shop products here</p>
      </div>

      {/* Empty State */}
      {products.length === 0 ? (
        <div className="flex items-center justify-center h-[50vh]">
          <div className="bg-white shadow rounded-2xl p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-700">
              No Shop Products Found
            </h2>

            <p className="text-gray-500 mt-2">Add products to continue</p>
          </div>
        </div>
      ) : (
        /* Product Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {products.map((item) => (
            <Card
              key={item.id}
              className="rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all border-0"
            >
              <CardContent className="p-4 space-y-3">
                {/* Image */}
                <div className="w-full h-44 rounded-xl overflow-hidden bg-gray-100">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      No Image
                    </div>
                  )}
                </div>

                {/* Category */}
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                  {item.category}
                </Badge>

                {/* Name */}
                <h2 className="font-semibold text-lg text-gray-800 line-clamp-1">
                  {item.name}
                </h2>

                {/* Description */}
                <p className="text-sm text-gray-500 line-clamp-2">
                  {item.description || "No description"}
                </p>

                {/* Brand */}
                <div className="flex items-center justify-between">
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded-lg text-gray-600">
                    {item.brand || "No Brand"}
                  </span>

                  <span className="text-sm text-gray-500">
                    Stock: {item.stock}
                  </span>
                </div>

                {/* Price */}
                <div className="flex items-center justify-between pt-2">
                  <p className="text-xl font-bold text-green-600">
                    ₹{item.price}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ShopProductsDashboard;
