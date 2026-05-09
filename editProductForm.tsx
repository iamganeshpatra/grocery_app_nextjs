"use client";

import { useState } from "react";
import { updateProduct } from "@/actions/product.action";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Props = {
  product: any;
};

const EditProductForm = ({ product }: Props) => {
  const router = useRouter();

  const [name, setName] = useState(product.name);
  const [price, setPrice] = useState(product.price);
  const [stock, setStock] = useState(product.stock);

  const handleUpdate = async () => {
    await updateProduct(product.id, {
      name,
      price: Number(price),
      stock: Number(stock),
    });

    router.push("/manager");
  };

  return (
    <div className="space-y-4">
      <Input value={name} onChange={(e) => setName(e.target.value)} />
      <Input
        type="number"
        value={price}
        onChange={(e) => setPrice(Number(e.target.value))}
      />
      <Input
        type="number"
        value={stock}
        onChange={(e) => setStock(Number(e.target.value))}
      />

      <Button className="w-full bg-green-600" onClick={handleUpdate}>
        Update Product
      </Button>
    </div>
  );
};

export default EditProductForm;