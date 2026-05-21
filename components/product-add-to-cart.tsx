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
    <div className="bg-green-300 p-1" key={product.id}>
      <h3>{product.product.name} </h3>
      <div>
        <p>Stock avaialble:</p>
        <input
          type="number"
          value={stock}
          onChange={(e) => setStock(+e.target.value)}
        />
      </div>
    </div>
  );
};

export default ProductAddCard;
