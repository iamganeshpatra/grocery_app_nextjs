"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { updateShop } from "@/actions/shop-owner.actions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";

const SHOP_CATEGORIES = [
  "Grocery",
  "Vegetables & Fruits",
  "Dairy & Eggs",
  "Meat & Fish",
  "Bakery",
  "Beverages",
  "Organic",
  "Snacks",
  "Other",
];

type Shop = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  contactPhone: string | null;
};

export function EditShopForm({ shop }: { shop: Shop }) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const [name, setName] = useState(shop.name);
  const [category, setCategory] = useState(shop.category);
  const [description, setDescription] = useState(shop.description ?? "");
  const [contactPhone, setContactPhone] = useState(shop.contactPhone ?? "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // VALIDATION
    if (!name.trim()) {
      toast.error("Shop name is required");
      return;
    }

    if (!category) {
      toast.error("Please select a category");
      return;
    }

    try {
      setLoading(true);

      // UPDATE SHOP
      await updateShop(shop.id, {
        name,
        category,
        description,
        contactPhone,
      });

      toast.success("Shop updated successfully!");

      // REDIRECT
      router.push(`/shop-owner/${shop.id}`);

      router.refresh();
    } catch (error) {
      console.log(error);

      toast.error("Failed to update shop");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-0 shadow-lg rounded-2xl">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* SHOP NAME */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Shop Name
              <span className="text-red-500"> *</span>
            </label>

            <Input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter shop name"
              className="h-11"
            />
          </div>

          {/* CATEGORY */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Category
              <span className="text-red-500"> *</span>
            </label>

            <select
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-11 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none"
            >
              {SHOP_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* DESCRIPTION */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>

            <Textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Write about your shop..."
            />
          </div>

          {/* PHONE */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Contact Phone</label>

            <Input
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="Enter phone number"
              className="h-11"
            />
          </div>

          {/* BUTTONS */}
          <div className="flex flex-col sm:flex-row gap-3 pt-3">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 h-11 bg-green-600 hover:bg-green-700"
            >
              {loading ? "Saving..." : "Save Changes"}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="flex-1 h-11"
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
