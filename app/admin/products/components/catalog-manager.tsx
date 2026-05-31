"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createProduct,
  updateProduct,
  deleteProduct,
} from "@/actions/admin.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

type Product = {
  id: string;
  name: string;
  category: string;
  brand: string | null;
  description: string | null;
  price: number;
  quantity: string;
  imageUrl: string | null;
};

const CATEGORIES = [
  "Grains",
  "Dairy",
  "Vegetables",
  "Fruits",
  "Bakery",
  "Beverages",
  "Snacks",
  "Other",
];

// ── Add / Edit Dialog ─────────────────────────────────────────────────────────

function ProductDialog({
  product,
  onClose,
}: {
  product: Product | null; // null = create mode
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(product?.name ?? "");
  const [category, setCategory] = useState(product?.category ?? "");
  const [brand, setBrand] = useState(product?.brand ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [price, setPrice] = useState(product ? String(product.price) : "");
  const [quantity, setQuantity] = useState(product?.quantity ?? "");
  const [imageUrl, setImageUrl] = useState(product?.imageUrl ?? "");

  function handleSave() {
    const priceNum = parseFloat(price);
    if (!name.trim()) return toast.error("Name is required");
    if (!category) return toast.error("Select a category");
    if (isNaN(priceNum) || priceNum <= 0)
      return toast.error("Enter a valid price");

    const payload = {
      name,
      category,
      brand,
      description,
      price: priceNum,
      quantity,
      imageUrl,
    };

    startTransition(async () => {
      const result = product
        ? await updateProduct(product.id, payload)
        : await createProduct(payload);

      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(product ? "Product updated" : "Product added");
      onClose();
      router.refresh();
    });
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold">
          {product ? "Edit Product" : "Add Product"}
        </h2>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1 col-span-2">
            <label className="text-sm font-medium">
              Name <span className="text-red-500">*</span>
            </label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm bg-background"
            >
              <option value="">Select…</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Brand</label>
            <Input value={brand} onChange={(e) => setBrand(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">
              Reference Price (₹) <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Unit</label>
            <Input
              placeholder="e.g. 1kg, 500ml"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
          <div className="space-y-1 col-span-2">
            <label className="text-sm font-medium">Image URL</label>
            <Input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
          </div>
          <div className="space-y-1 col-span-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button onClick={handleSave} disabled={isPending} className="flex-1">
            {isPending ? "Saving…" : product ? "Save Changes" : "Add Product"}
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function CatalogManager({
  initialProducts,
  query,
  page,
  totalPages,
}: {
  initialProducts: Product[];
  query: string;
  page: number;
  totalPages: number;
}) {
  const router = useRouter();
  const [search, setSearch] = useState(query);
  const [dialogProduct, setDialogProduct] = useState<Product | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function runSearch(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/admin/products?q=${encodeURIComponent(search)}`);
  }

  function openCreate() {
    setDialogProduct(null);
    setDialogOpen(true);
  }
  function openEdit(p: Product) {
    setDialogProduct(p);
    setDialogOpen(true);
  }

  function handleDelete(p: Product) {
    if (!confirm(`Delete "${p.name}" from the catalog?`)) return;
    startTransition(async () => {
      const result = await deleteProduct(p.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`"${p.name}" deleted`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <form onSubmit={runSearch} className="flex gap-2 flex-1">
          <Input
            placeholder="Search by name, category, or brand…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button type="submit" variant="outline">
            Search
          </Button>
        </form>
        <Button onClick={openCreate}>+ Add Product</Button>
      </div>

      {initialProducts.length === 0 ? (
        <div className="border rounded-lg p-12 text-center text-muted-foreground">
          No products found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {initialProducts.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-3 flex gap-3">
                {p.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.imageUrl}
                    alt={p.name}
                    className="w-16 h-16 rounded object-cover bg-muted"
                  />
                ) : (
                  <div className="w-16 h-16 rounded bg-muted shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.brand ? `${p.brand} · ` : ""}
                    {p.quantity}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary">{p.category}</Badge>
                    <span className="text-sm font-medium">₹{p.price}</span>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEdit(p)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={isPending}
                      onClick={() => handleDelete(p)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() =>
              router.push(
                `/admin/products?q=${encodeURIComponent(query)}&page=${page - 1}`,
              )
            }
          >
            ← Prev
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() =>
              router.push(
                `/admin/products?q=${encodeURIComponent(query)}&page=${page + 1}`,
              )
            }
          >
            Next →
          </Button>
        </div>
      )}

      {dialogOpen && (
        <ProductDialog
          product={dialogProduct}
          onClose={() => setDialogOpen(false)}
        />
      )}
    </div>
  );
}
