"use client";

import { useState } from "react";
import SearchBox from "./searchBox";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ProductActions from "@/productActions";

const ManagerDashboard = ({ products }: { products: any[] }) => {
  const [search, setSearch] = useState("");

  const filteredProducts = products.filter((item) =>
    item.product.name.toLowerCase().includes(search.toLowerCase()) ||
    item.product.brand?.toLowerCase().includes(search.toLowerCase()) ||
    item.product.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 bg-gray-100 min-h-screen">

      {/* 🔥 HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-800">
          Manager Dashboard
        </h1>

        {/* ✅ Search on right */}
        <SearchBox onSearch={setSearch} />
      </div>

      {/* EMPTY STATE */}
      {filteredProducts.length === 0 ? (
        <div className="flex items-center justify-center h-[60vh]">
          <p className="text-gray-500 text-lg">
            No Products Found
          </p>
        </div>
      ) : (

        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">

          {filteredProducts.map((item) => (
            <Card key={item.product.id} className="rounded-2xl shadow hover:shadow-lg transition">

              <CardContent className="p-4 flex flex-col gap-3">

                {/* Image */}
                <div className="h-40 bg-gray-100 rounded-lg overflow-hidden">
                  {item.imageUrl ? (
                    <img src={item.product.imageUrl} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      No Image
                    </div>
                  )}
                </div>

                {/* Info */}
                <div>
                  <h2 className="font-semibold">{item.product.name}</h2>
                  <p className="text-xs text-gray-500">
                    {item.product.brand || "No Brand"}
                  </p>
                </div>

                <Badge>{item.product.category}</Badge>

                <div className="flex justify-between">
                  <span className="text-green-600 font-bold">
                    ₹{item.product.price}
                  </span>
                  <span className="text-sm text-gray-500">
                    Stock: {item.stock}
                  </span>
                </div>

                <ProductActions id={item.product.id} />

              </CardContent>
            </Card>
          ))}

        </div>
      )}
    </div>
  );
};

export default ManagerDashboard;