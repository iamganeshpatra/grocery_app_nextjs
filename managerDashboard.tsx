"use client";

import { useState } from "react";
import SearchBox from "./searchBox";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ProductActions from "@/productActions";

const ManagerDashboard = ({ products }: { products: any[] }) => {
  const [search, setSearch] = useState("");

  const filteredProducts = products.filter(
    (item) =>
      item.product.name.toLowerCase().includes(search.toLowerCase()) ||
      item.product.brand?.toLowerCase().includes(search.toLowerCase()) ||
      item.product.category.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-5">
        {/* PRODUCT COUNT */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-700">Products</h2>

          <Badge className="bg-green-600 hover:bg-green-600 text-white px-3 py-1 rounded-full">
            {filteredProducts.length} Items
          </Badge>
        </div>

        {/* EMPTY STATE */}
        {filteredProducts.length === 0 ? (
          <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-700">
                No Products Found
              </h2>

              <p className="text-sm text-gray-500 mt-2">
                Try searching with another keyword
              </p>
            </div>
          </div>
        ) : (
          /* PRODUCT GRID */
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredProducts.map((item) => (
              <Card
                key={item.product.id}
                className="group overflow-hidden border border-gray-200 rounded-2xl bg-white hover:shadow-xl transition-all duration-300"
              >
                <CardContent className="p-0">
                  {/* IMAGE */}
                  <div className="relative bg-white h-40 sm:h-48 overflow-hidden">
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

                    {/* CATEGORY BADGE */}
                    <div className="absolute top-2 left-2">
                      <Badge className="bg-white text-gray-700 border shadow-sm text-[10px] sm:text-xs">
                        {item.product.category}
                      </Badge>
                    </div>
                  </div>

                  {/* DETAILS */}
                  <div className="p-3 flex flex-col gap-2">
                    {/* NAME */}
                    <div>
                      <h2 className="font-semibold text-sm sm:text-base line-clamp-1 text-gray-800">
                        {item.product.name}
                      </h2>

                      <p className="text-xs text-gray-500 line-clamp-1">
                        {item.product.brand || "No Brand"}
                      </p>
                    </div>

                    {/* PRICE + STOCK */}
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex flex-col">
                        <span className="text-green-600 font-bold text-base sm:text-lg">
                          ₹{item.product.price}
                        </span>

                        <span className="text-[11px] text-gray-400">
                          Inclusive of all taxes
                        </span>
                      </div>

                      <div className="text-right">
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded-full ${
                            item.stock > 10
                              ? "bg-green-100 text-green-700"
                              : item.stock > 0
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-700"
                          }`}
                        >
                          Stock: {item.stock}
                        </span>
                      </div>
                    </div>

                    {/* ACTIONS */}
                    <div className="pt-2">
                      <ProductActions id={item.product.id} />
                    </div>
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

export default ManagerDashboard;
