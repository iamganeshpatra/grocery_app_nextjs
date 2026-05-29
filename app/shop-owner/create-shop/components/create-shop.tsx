"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreateShop } from "@/actions/shop-owner.actions";

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

export default function CreateShopPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Shop name is required");
      return;
    }
    if (!category) {
      toast.error("Please select a category");
      return;
    }

    setLoading(true);

    const result = await CreateShop({
      name,
      category,
      description,
      contactPhone,
    });

    if (result.error) {
      toast.error(result.error);
      setLoading(false);
      return;
    }

    toast.success("Shop created!");
    router.push(`/shop-owner/${result.shop!.id}`);
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <Link
          href="/shop-owner"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to My Shops
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create a New Shop</CardTitle>
          <CardDescription>
            Fill in your shop details. You can edit these later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">
                Shop Name <span className="text-red-500">*</span>
              </label>
              <Input
                required
                placeholder="e.g. Singh Fresh Market"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              >
                <option value="">Select a category</option>
                {SHOP_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                placeholder="Brief description of your shop (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Contact Phone</label>
              <Input
                type="tel"
                placeholder="e.g. +91 98765 43210 (optional)"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Shop"}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/shop-owner">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
