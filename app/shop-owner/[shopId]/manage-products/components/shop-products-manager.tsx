"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { addProductToShop, removeProductFromShop, searchCatalog, updateShopProduct } from "@/actions/shop-product.action";

// ── Types ─────────────────────────────────────────────────────────────────────

type Product = {
  id: string;
  name: string;
  category: string;
  brand: string | null;
  price: number;
  quantity: string;
  imageUrl: string | null;
};

type ShopProductWithProduct = {
  id: string;
  stock: number;
  price: number;
  product: Product;
};

// ── Stock badge colour ────────────────────────────────────────────────────────

function StockBadge({ stock }: { stock: number }) {
  if (stock === 0) return <Badge variant="destructive">Out of Stock</Badge>;
  if (stock <= 4)
    return <Badge className="bg-orange-500 text-white">Low: {stock}</Badge>;
  return <Badge className="bg-green-600 text-white">{stock} in stock</Badge>;
}

// ── Add Product Dialog ────────────────────────────────────────────────────────

function AddProductDialog({
  shopId,
  product,
  onAdded,
  onClose,
}: {
  shopId: string;
  product: Product;
  onAdded: (newItem: ShopProductWithProduct) => void;
  onClose: () => void;
}) {
  const [stock, setStock] = useState("");
  const [price, setPrice] = useState(String(product.price));
  const [isPending, startTransition] = useTransition();

  function handleAdd() {
    const stockNum = parseInt(stock, 10);
    const priceNum = parseFloat(price);

    if (isNaN(stockNum) || stockNum < 0) {
      toast.error("Enter a valid stock quantity");
      return;
    }
    if (isNaN(priceNum) || priceNum <= 0) {
      toast.error("Enter a valid price");
      return;
    }

    startTransition(async () => {
      const result = await addProductToShop(shopId, {
        productId: product.id,
        stock: stockNum,
        price: priceNum,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(`${product.name} added to shop`);
      onAdded({
        id: result.data!.id,
        stock: stockNum,
        price: priceNum,
        product,
      });
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-semibold">Add to Shop</h2>
        <div className="text-sm text-muted-foreground">
          <p className="font-medium text-foreground">{product.name}</p>
          <p>
            {product.category} · {product.quantity}
          </p>
          <p>Reference price: ₹{product.price}</p>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">
              Stock Quantity <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              min="0"
              placeholder="e.g. 50"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">
              Your Selling Price (₹) <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              This is the price customers will pay at your shop.
            </p>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button onClick={handleAdd} disabled={isPending} className="flex-1">
            {isPending ? "Adding..." : "Add to Shop"}
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Edit Product Dialog ───────────────────────────────────────────────────────

function EditProductDialog({
  shopId,
  item,
  onUpdated,
  onClose,
}: {
  shopId: string;
  item: ShopProductWithProduct;
  onUpdated: (updated: ShopProductWithProduct) => void;
  onClose: () => void;
}) {
  const [stock, setStock] = useState(String(item.stock));
  const [price, setPrice] = useState(String(item.price));
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    const stockNum = parseInt(stock, 10);
    const priceNum = parseFloat(price);

    if (isNaN(stockNum) || stockNum < 0) {
      toast.error("Enter a valid stock quantity");
      return;
    }
    if (isNaN(priceNum) || priceNum <= 0) {
      toast.error("Enter a valid price");
      return;
    }

    startTransition(async () => {
      const result = await updateShopProduct(shopId, item.id, {
        stock: stockNum,
        price: priceNum,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Updated");
      onUpdated({ ...item, stock: stockNum, price: priceNum });
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-semibold">Edit: {item.product.name}</h2>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">Stock Quantity</label>
            <Input
              type="number"
              min="0"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Selling Price (₹)</label>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <Button onClick={handleSave} disabled={isPending} className="flex-1">
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function ShopProductsManager({
  shopId,
  initialInventory,
  isOwner,
}: {
  shopId: string;
  initialInventory: ShopProductWithProduct[];
  isOwner: boolean;
}) {
  const [inventory, setInventory] = useState(initialInventory);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [addTarget, setAddTarget] = useState<Product | null>(null);
  const [editTarget, setEditTarget] = useState<ShopProductWithProduct | null>(
    null,
  );

  const [isPendingRemove, startRemoveTransition] = useTransition();

  async function handleSearch(query: string) {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    const result = await searchCatalog(shopId, query);
    setIsSearching(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }
    setSearchResults(result.data);
  }

  function handleProductAdded(newItem: ShopProductWithProduct) {
    setInventory((prev) => [newItem, ...prev]);
    // Remove from search results
    setSearchResults((prev) => prev.filter((p) => p.id !== newItem.product.id));
  }

  function handleProductUpdated(updated: ShopProductWithProduct) {
    setInventory((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item)),
    );
  }

  function handleRemove(shopProductId: string, productName: string) {
    if (!confirm(`Remove "${productName}" from your shop?`)) return;

    startRemoveTransition(async () => {
      const result = await removeProductFromShop(shopId, shopProductId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setInventory((prev) => prev.filter((item) => item.id !== shopProductId));
      toast.success(`"${productName}" removed`);
    });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* ─── LEFT: Catalog Search ─────────────────────────────────── */}
      <div>
        <h2 className="font-semibold mb-3">Search Product Catalog</h2>
        <Input
          placeholder="Search by name, category, or brand..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="mb-3"
        />

        {isSearching && (
          <p className="text-sm text-muted-foreground">Searching...</p>
        )}

        {!isSearching && searchQuery && searchResults.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No products found for &quot;{searchQuery}&quot;.
          </p>
        )}

        {!searchQuery && (
          <p className="text-sm text-muted-foreground">
            Type to search the product catalog. Products already in your shop
            are hidden.
          </p>
        )}

        <div className="space-y-2 mt-2">
          {searchResults.map((product) => (
            <Card
              key={product.id}
              className="hover:shadow-sm transition-shadow"
            >
              <CardContent className="p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {product.category}
                    {product.brand ? ` · ${product.brand}` : ""} ·{" "}
                    {product.quantity}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Ref. price: ₹{product.price}
                  </p>
                </div>
                <Button size="sm" onClick={() => setAddTarget(product)}>
                  + Add
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* ─── RIGHT: Inventory ─────────────────────────────────────── */}
      <div>
        <h2 className="font-semibold mb-3">
          Your Inventory ({inventory.length})
        </h2>

        {inventory.length === 0 ? (
          <div className="border rounded-lg p-8 text-center text-muted-foreground">
            <p>No products in your shop yet.</p>
            <p className="text-sm mt-1">
              Search the catalog on the left to add some.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {inventory.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">
                      {item.product.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.product.category} · {item.product.quantity}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <StockBadge stock={item.stock} />
                      <span className="text-sm font-medium">₹{item.price}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditTarget(item)}
                    >
                      Edit
                    </Button>
                    {isOwner && (
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={isPendingRemove}
                        onClick={() => handleRemove(item.id, item.product.name)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ─── Dialogs ─────────────────────────────────────────────── */}
      {addTarget && (
        <AddProductDialog
          shopId={shopId}
          product={addTarget}
          onAdded={handleProductAdded}
          onClose={() => setAddTarget(null)}
        />
      )}

      {editTarget && (
        <EditProductDialog
          shopId={shopId}
          item={editTarget}
          onUpdated={handleProductUpdated}
          onClose={() => setEditTarget(null)}
        />
      )}
    </div>
  );
}
