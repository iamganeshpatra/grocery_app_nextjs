"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Textarea } from "@/components/ui/textarea";
import { AddUserAddress } from "@/actions/user-address.action";

const CustomerAddress = ({ userId }: { userId: string }) => {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [houseNo, setHouseNo] = useState("");
  const [area, setArea] = useState("");
  const [landmark, setLandmark] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      setLoading(true);

      await AddUserAddress({
        userId,
        fullName,
        phone,
        houseNo,
        area,
        landmark,
        city,
        state,
        pincode,
        isDefault,
      });

      alert("Address added successfully ✅");

      // RESET
      setFullName("");
      setPhone("");
      setHouseNo("");
      setArea("");
      setLandmark("");
      setCity("");
      setState("");
      setPincode("");
      setIsDefault(false);

      // REDIRECT
      router.push("/customer/checkout");
    } catch (err) {
      console.log(err);
      alert("Something went wrong ❌");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl rounded-3xl border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center text-gray-800">
            Add Delivery Address
          </CardTitle>

          <p className="text-sm text-gray-500 text-center">
            Enter your address details for delivery
          </p>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* FULL NAME */}
          <Input
            placeholder="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />

          {/* PHONE */}
          <Input
            placeholder="Phone Number"
            value={phone}
            maxLength={10}
            onChange={(e) => setPhone(e.target.value)}
          />

          {/* HOUSE NO */}
          <Input
            placeholder="House No / Flat / Building"
            value={houseNo}
            onChange={(e) => setHouseNo(e.target.value)}
          />

          {/* AREA */}
          <Textarea
            placeholder="Area / Street / Locality"
            value={area}
            onChange={(e) => setArea(e.target.value)}
          />

          {/* LANDMARK */}
          <Input
            placeholder="Landmark (Optional)"
            value={landmark}
            onChange={(e) => setLandmark(e.target.value)}
          />

          {/* CITY + STATE */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              placeholder="City"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />

            <Input
              placeholder="State"
              value={state}
              onChange={(e) => setState(e.target.value)}
            />
          </div>

          {/* PINCODE */}
          <Input
            placeholder="Pincode"
            value={pincode}
            maxLength={6}
            onChange={(e) => setPincode(e.target.value)}
          />

          {/* DEFAULT ADDRESS */}
          <div className="flex items-center gap-3 border rounded-2xl p-4 bg-gray-50">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="w-5 h-5 accent-green-600"
            />

            <div>
              <p className="font-medium text-sm text-gray-800">
                Make this my default address
              </p>

              <p className="text-xs text-gray-500">
                Automatically selected during checkout
              </p>
            </div>
          </div>

          {/* BUTTON */}
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 h-12 rounded-2xl"
          >
            {loading ? "Saving Address..." : "Save Address"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerAddress;
