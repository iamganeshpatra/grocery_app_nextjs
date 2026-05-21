"use client";

import { deleteShop } from "@/actions/shop-owner.actions";
import { useRouter } from "next/navigation";
import { useState } from "react";

type DeleteShopButtonProps = {
  shopId: string;
};

const DeleteShopButton = ({ shopId }: DeleteShopButtonProps) => {
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const handleDeleteShop = async () => {
    try {
      setLoading(true);

      await deleteShop(shopId);

      alert("Shop deleted successfully");

      router.refresh();
    } catch (error) {
      console.log(error);

      alert("Failed to delete shop");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDeleteShop}
      disabled={loading}
      className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-xl text-sm font-medium transition disabled:opacity-50"
    >
      {loading ? "Deleting..." : "Delete Shop"}
    </button>
  );
};

export default DeleteShopButton;
