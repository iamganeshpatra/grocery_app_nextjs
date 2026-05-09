"use client";

import { useRouter } from "next/navigation";
import { addToCart, removeToCart } from "./actions/product.action";
import { Minus, Plus } from "lucide-react";

const AddAndRemoveCart = ({
  userId,
  productId,
  quantity,
}: {
  userId?: string;
  productId: string;
  quantity: number;
}) => {

  const router = useRouter();

  const handleAdd = async () => {

    if (!userId) return;

    await addToCart(userId, productId);

    router.refresh();
  };

  const handleRemove = async () => {

    if (!userId) return;

    await removeToCart(userId, productId);

    router.refresh();
  };

  return (
    <div className="flex items-center gap-3 bg-green-600 text-white px-3 py-2 rounded-full w-fit">

      {/* Minus */}
      <button
        onClick={handleRemove}
        className="active:scale-90 transition"
      >
        <Minus className="w-4 h-4" />
      </button>

      {/* Quantity */}
      <span className="font-semibold text-sm min-w-[20px] text-center">
        {quantity}
      </span>

      {/* Plus */}
      <button
        onClick={handleAdd}
        className="active:scale-90 transition"
      >
        <Plus className="w-4 h-4" />
      </button>

    </div>
  );
};

export default AddAndRemoveCart;