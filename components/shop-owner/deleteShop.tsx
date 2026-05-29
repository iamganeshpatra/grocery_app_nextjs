"use client";

import { deleteShop } from "@/actions/shop-owner.actions";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";

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
      className="flex items-center justify-center rounded-full p-2 text-red-500 transition hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
    >
      <Trash2 size={18} className={loading ? "animate-pulse" : ""} />
    </button>
  );
};

export default DeleteShopButton;
