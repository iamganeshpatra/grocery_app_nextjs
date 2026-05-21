"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { CreateShop } from "@/actions/shop-owner.actions";

const CreateShopPage = () => {
  const router = useRouter();

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");

  const [loading, setLoading] = useState(false);

  const handleCreateShop = async () => {
    try {
      setLoading(true);

      await CreateShop({
        name,
        category,
      });

      // ✅ redirect after create
      router.push("/shop-owner");
    } catch (error) {
      console.log(error);
      alert("Failed to create shop");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center px-4">
      <Card className="w-full max-w-md rounded-3xl border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            Create Shop
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <Input
            placeholder="Shop Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <Input
            placeholder="Shop Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />

          <Button
            onClick={handleCreateShop}
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 rounded-xl"
          >
            {loading ? "Creating..." : "Create Shop"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateShopPage;
