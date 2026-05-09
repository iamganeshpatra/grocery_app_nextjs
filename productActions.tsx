"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { deleteProduct } from "@/actions/product.action";

const ProductActions = ({ id }: { id: string }) => {
  const router = useRouter();

  const handleEdit = () => {
    console.log("Edit clicked ID:", id);
    router.push(`/manager/edit/${id}`);
  };

  const handleDelete = async () => {
    const confirmDelete = confirm("Delete this product?");
    if (!confirmDelete) return;

    await deleteProduct(id);
    router.refresh();
  };

  return (
    <div className="flex gap-2 mt-3">
      <Button variant="outline" className="flex-1" onClick={handleEdit}>
        ✏️ Edit
      </Button>

      <Button variant="destructive" className="flex-1" onClick={handleDelete}>
        🗑 Delete
      </Button>
    </div>
  );
};

export default ProductActions;