"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { addToCart } from "@/actions/cart.actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StarDisplay } from "@/components/shared/star-rating";

export function AddToCartCard({
  productId,
  shopId,
  shopName,
  shopCategory,
  price,
  stock,
  avgRating,
  ratingCount,
}: {
  productId: string;
  shopId: string;
  shopName: string;
  shopCategory: string;
  price: number;
  stock: number;
  avgRating: number;
  ratingCount: number;
}) {
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [isPending, startTransition] = useTransition();

  function handleAdd() {
    startTransition(async () => {
      const result = await addToCart({ productId, shopId, quantity: qty });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`Added to cart from ${shopName}`);
      router.refresh(); // updates the navbar cart count
    });
  }

  return (
    <Card>
      <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="font-medium">{shopName}</p>
          <p className="text-xs text-muted-foreground">{shopCategory}</p>
          {ratingCount > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <StarDisplay rating={avgRating} />
              <span className="text-xs text-muted-foreground">
                ({ratingCount})
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="font-semibold">₹{price}</span>
          {stock === 0 ? (
            <Badge variant="destructive">Out of Stock</Badge>
          ) : (
            <>
              <select
                value={qty}
                onChange={(e) => setQty(parseInt(e.target.value, 10))}
                className="border rounded-md px-2 py-1 text-sm bg-background"
              >
                {Array.from(
                  { length: Math.min(stock, 10) },
                  (_, i) => i + 1,
                ).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <Button size="sm" onClick={handleAdd} disabled={isPending}>
                {isPending ? "Adding…" : "Add to Cart"}
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
