"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { placeOrder } from "@/actions/order.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createAddress } from "@/actions/user-address.action";

type Address = {
  id: string;
  fullName: string;
  phone: string;
  houseNo: string;
  area: string;
  landmark: string | null;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
};

type Line = {
  shopName: string;
  productName: string;
  quantity: number;
  price: number;
};

export function CheckoutView({
  addresses,
  lines,
}: {
  addresses: Address[];
  lines: Line[];
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(
    addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id ?? "",
  );
  const [showForm, setShowForm] = useState(addresses.length === 0);
  const [isPending, startTransition] = useTransition();

  // New-address form state
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    houseNo: "",
    area: "",
    landmark: "",
    city: "",
    state: "",
    pincode: "",
  });

  function field(name: keyof typeof form) {
    return {
      value: form[name],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm({ ...form, [name]: e.target.value }),
    };
  }

  function saveAddress() {
    if (
      !form.fullName ||
      !form.phone ||
      !form.houseNo ||
      !form.city ||
      !form.state ||
      !form.pincode
    ) {
      toast.error("Fill in all required address fields");
      return;
    }
    startTransition(async () => {
      const result = await createAddress({
        ...form,
        isDefault: addresses.length === 0,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Address saved");
      setShowForm(false);
      router.refresh();
    });
  }

  function handlePlaceOrder() {
    if (!selectedId) {
      toast.error("Select a delivery address");
      return;
    }
    startTransition(async () => {
      const result = await placeOrder(selectedId);
      if (result.error) {
        toast.error(result.error);
        if ("invalid" in result && result.invalid)
          router.push("/customer/cart");
        return;
      }
      const ids = result.data!.orders.map((o) => o.id).join(",");
      router.push(`/customer/checkout/confirmation?ids=${ids}`);
    });
  }

  // Group lines by shop for the summary
  const byShop = new Map<string, Line[]>();
  for (const l of lines) {
    const list = byShop.get(l.shopName) ?? [];
    list.push(l);
    byShop.set(l.shopName, list);
  }
  const grandTotal = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);

  return (
    <div className="space-y-6">
      {/* Address selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Delivery Address</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {addresses.map((a) => (
            <label
              key={a.id}
              className="flex items-start gap-3 border rounded-md p-3 cursor-pointer"
            >
              <input
                type="radio"
                name="address"
                checked={selectedId === a.id}
                onChange={() => setSelectedId(a.id)}
                className="mt-1"
              />
              <div className="text-sm">
                <p className="font-medium">
                  {a.fullName} · {a.phone}
                </p>
                <p className="text-muted-foreground">
                  {a.houseNo}, {a.area}
                  {a.landmark ? `, ${a.landmark}` : ""}, {a.city}, {a.state} -{" "}
                  {a.pincode}
                </p>
                {a.isDefault && (
                  <span className="text-xs text-green-600">Default</span>
                )}
              </div>
            </label>
          ))}

          {!showForm ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowForm(true)}
            >
              + Add New Address
            </Button>
          ) : (
            <div className="border rounded-md p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Full name *" {...field("fullName")} />
                <Input placeholder="Phone *" {...field("phone")} />
                <Input placeholder="House / Flat no. *" {...field("houseNo")} />
                <Input placeholder="Area / Street *" {...field("area")} />
                <Input placeholder="Landmark" {...field("landmark")} />
                <Input placeholder="City *" {...field("city")} />
                <Input placeholder="State *" {...field("state")} />
                <Input placeholder="Pincode *" {...field("pincode")} />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={saveAddress} disabled={isPending}>
                  Save Address
                </Button>
                {addresses.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Order Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...byShop.entries()].map(([shopName, shopLines]) => {
            const shopTotal = shopLines.reduce(
              (sum, l) => sum + l.price * l.quantity,
              0,
            );
            return (
              <div key={shopName}>
                <p className="text-sm font-medium">{shopName}</p>
                {shopLines.map((l, i) => (
                  <div
                    key={i}
                    className="flex justify-between text-sm text-muted-foreground"
                  >
                    <span>
                      {l.productName} × {l.quantity}
                    </span>
                    <span>₹{l.price * l.quantity}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm border-t mt-1 pt-1">
                  <span>Shop subtotal</span>
                  <span>₹{shopTotal}</span>
                </div>
              </div>
            );
          })}
          <div className="flex justify-between font-semibold border-t pt-3">
            <span>Grand Total</span>
            <span>₹{grandTotal}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Payment method: Cash on Delivery
          </p>
        </CardContent>
      </Card>

      <Button
        className="w-full"
        onClick={handlePlaceOrder}
        disabled={isPending || !selectedId}
      >
        {isPending ? "Placing order…" : "Place Order"}
      </Button>
    </div>
  );
}
