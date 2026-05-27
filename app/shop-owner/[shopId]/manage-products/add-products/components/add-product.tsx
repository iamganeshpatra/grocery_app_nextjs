"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreateProduct } from "@/actions/product.action";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  shopId: string;
};

const CreateProductClient = ({ shopId }: Props) => {
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [stock, setStock] = useState("");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      setLoading(true);

      await CreateProduct({
        name,
        description,
        price: Number(price),
        quantity,
        stock: Number(stock),
        category,
        brand,
        imageUrl,
      });

      alert("Product created successfully ✅");

      // reset
      setName("");
      setDescription("");
      setPrice("");
      setQuantity("");
      setStock("");
      setCategory("");
      setBrand("");
      setImageUrl("");

      // redirect
      router.push(`/shop-owner/create-shop/${shopId}/manage-products`);
    } catch (err) {
      console.log(err);
      alert("Something went wrong ❌");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <Card className="w-full max-w-2xl shadow-lg rounded-2xl">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-semibold">
            Add New Product
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <Input
            placeholder="Product Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <Textarea
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <Input
            placeholder="Quantity (e.g. 1kg)"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />

          <div className="flex gap-3">
            <Input
              type="number"
              placeholder="Price"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />

            <Input
              type="number"
              placeholder="Stock"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
            />
          </div>

          <div className="flex gap-3">
            <Input
              placeholder="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />

            <Input
              placeholder="Brand"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
            />
          </div>

          <Input
            placeholder="Image URL"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />

          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            {loading ? "Creating..." : "Create Product"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateProductClient;
