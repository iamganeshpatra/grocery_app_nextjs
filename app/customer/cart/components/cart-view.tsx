"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { updateCartQuantity, removeFromCart } from "@/actions/cart.actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type CartItem = {
  id: string;
  productName: string;
  shopName: string;
  quantity: number;
  price: number;
  stock: number;
};

export function CartView({ initialItems }: { initialItems: CartItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [isPending, startTransition] = useTransition();

  function changeQty(id: string, nextQty: number) {
    if (nextQty < 1) return;
    startTransition(async () => {
      const result = await updateCartQuantity(id, nextQty);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, quantity: nextQty } : i)),
      );
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const result = await removeFromCart(id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast.success("Removed from cart");
      router.refresh();
    });
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16 border rounded-lg bg-muted/20">
        <p className="text-muted-foreground mb-4">Your cart is empty.</p>
        <Button asChild>
          <Link href="/customer">Browse Products</Link>
        </Button>
      </div>
    );
  }

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const overStock = item.quantity > item.stock;
        return (
          <Card key={item.id}>
            <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <p className="font-medium">{item.productName}</p>
                <p className="text-xs text-muted-foreground">
                  {item.shopName} · ₹{item.price} each
                </p>
                {overStock && (
                  <p className="text-xs text-red-600 mt-1">
                    Only {item.stock} left — reduce the quantity to continue.
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isPending || item.quantity <= 1}
                    onClick={() => changeQty(item.id, item.quantity - 1)}
                  >
                    −
                  </Button>
                  <span className="w-8 text-center text-sm">
                    {item.quantity}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isPending || item.quantity >= item.stock}
                    onClick={() => changeQty(item.id, item.quantity + 1)}
                  >
                    +
                  </Button>
                </div>
                <span className="font-semibold w-16 text-right">
                  ₹{item.price * item.quantity}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => remove(item.id)}
                >
                  Remove
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}

      <div className="flex items-center justify-between border-t pt-4">
        <span className="text-lg font-semibold">Total: ₹{total}</span>
        <Button asChild disabled={items.some((i) => i.quantity > i.stock)}>
          <Link href="/customer/checkout">Proceed to Checkout</Link>
        </Button>
      </div>
    </div>
  );
}
