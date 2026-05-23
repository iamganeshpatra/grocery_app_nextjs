"use client";

import { useEffect, useState } from "react";
import { ShopProductWithProduct } from "@/lib/types";
import { updateShopProduct } from "@/actions/shop-product.action";
import { toast } from "sonner";

const ProductAddCard = ({
  product,
}: {
  product: ShopProductWithProduct;
  updateShopProduct: (productId: string, stock: number) => Promise<void>;
}) => {
  const [stock, setStock] = useState(product.stock);

  useEffect(() => {
    const handleUpdate = async () => {
      await updateShopProduct(product.id, stock);

      toast.success(`Stock for ${product.product.name} is updated!!`);
    };

    handleUpdate();
  }, [stock]);

  return (
    <div
      className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
      key={product.id}
    >
      {/* PRODUCT INFO */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800">
          {product.product.name}
        </h3>

        <p className="text-sm text-gray-500">{product.product.category}</p>
      </div>

      {/* STOCK */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-gray-600">Stock</span>

        <input
          type="number"
          value={stock || ""}
          onChange={(e) => setStock(+e.target.value)}
          className="w-20 rounded-lg border border-gray-300 bg-gray-50 p-2 text-center text-lg font-semibold outline-none focus:border-black"
        />
      </div>
    </div>
  );
};

export default ProductAddCard;
