"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createAddress, deleteAddress, setDefaultAddress, updateAddress } from "@/actions/user-address.action";

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

const EMPTY = {
  fullName: "",
  phone: "",
  houseNo: "",
  area: "",
  landmark: "",
  city: "",
  state: "",
  pincode: "",
  isDefault: false,
};

export function AddressManager({
  initialAddresses,
}: {
  initialAddresses: Address[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Address | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [isPending, startTransition] = useTransition();

  function field(name: keyof typeof form) {
    return {
      value: String(form[name] ?? ""),
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm({ ...form, [name]: e.target.value }),
    };
  }

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY });
    setShowForm(true);
  }
  function openEdit(a: Address) {
    setEditing(a);
    setForm({ ...a, landmark: a.landmark ?? "" });
    setShowForm(true);
  }

  function save() {
    if (
      !form.fullName ||
      !form.phone ||
      !form.houseNo ||
      !form.city ||
      !form.state ||
      !form.pincode
    ) {
      toast.error("Fill in all required fields");
      return;
    }
    startTransition(async () => {
      const payload = { ...form, isDefault: !!form.isDefault };
      const result = editing
        ? await updateAddress(editing.id, payload)
        : await createAddress(payload);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(editing ? "Address updated" : "Address added");
      setShowForm(false);
      router.refresh();
    });
  }

  function remove(a: Address) {
    if (!confirm("Delete this address?")) return;
    startTransition(async () => {
      const result = await deleteAddress(a.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Address deleted");
      router.refresh();
    });
  }

  function makeDefault(a: Address) {
    startTransition(async () => {
      const result = await setDefaultAddress(a.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Default address updated");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {!showForm && <Button onClick={openCreate}>+ Add Address</Button>}

      {showForm && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <h2 className="font-medium">
              {editing ? "Edit Address" : "New Address"}
            </h2>
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
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!form.isDefault}
                onChange={(e) =>
                  setForm({ ...form, isDefault: e.target.checked })
                }
              />
              Set as default address
            </label>
            <div className="flex gap-2">
              <Button size="sm" onClick={save} disabled={isPending}>
                {editing ? "Save Changes" : "Save Address"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {initialAddresses.length === 0 && !showForm ? (
        <p className="text-muted-foreground">
          You have no saved addresses yet.
        </p>
      ) : (
        <div className="space-y-2">
          {initialAddresses.map((a) => (
            <Card key={a.id}>
              <CardContent className="p-4 flex justify-between items-start gap-4">
                <div className="text-sm">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">
                      {a.fullName} · {a.phone}
                    </p>
                    {a.isDefault && (
                      <Badge className="bg-green-600 text-white">Default</Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground">
                    {a.houseNo}, {a.area}
                    {a.landmark ? `, ${a.landmark}` : ""}, {a.city}, {a.state} -{" "}
                    {a.pincode}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  {!a.isDefault && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isPending}
                      onClick={() => makeDefault(a)}
                    >
                      Set Default
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isPending}
                    onClick={() => openEdit(a)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isPending}
                    onClick={() => remove(a)}
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
