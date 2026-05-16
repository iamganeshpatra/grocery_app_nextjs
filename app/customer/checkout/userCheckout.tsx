"use client";

import { useState, useTransition } from "react";
import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { RemoveUserAddress } from "@/actions/user-address.action";

const UserCheckoutPage = ({
  addresses,
  cartItems,
  subtotal,
  deliveryFee,
  totalAmount,
}: any) => {
  const [selectedAddress, setSelectedAddress] = useState(
    addresses.find((a: any) => a.isDefault)?.id || "",
  );

  const [allAddresses, setAllAddresses] = useState(addresses);

  const [isPending, startTransition] = useTransition();

  const handleRemove = async (id: string) => {
    try {
      startTransition(async () => {
        await RemoveUserAddress(id);

        setAllAddresses((prev: any) =>
          prev.filter((address: any) => address.id !== id),
        );

        // remove selected address if deleted
        if (selectedAddress === id) {
          setSelectedAddress("");
        }
      });
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] pb-40">
      <div className="max-w-7xl mx-auto px-3 sm:px-5 py-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* LEFT SIDE */}
        <div className="lg:col-span-2 flex flex-col gap-4 max-w-[650px]">
          {/* ADDRESS */}
          <Card className="rounded-2xl sm:rounded-3xl border-0 shadow-sm">
            <CardContent className="p-4 sm:p-5">
              {/* TOP */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-base sm:text-xl font-bold text-gray-800">
                    Delivery Address
                  </h2>

                  <p className="text-[11px] sm:text-sm text-gray-500">
                    Choose where your order should arrive
                  </p>
                </div>

                <Link
                  href="/customer/address"
                  className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2.5 rounded-xl text-center font-medium"
                >
                  + Add Address
                </Link>
              </div>

              {/* EMPTY */}
              {allAddresses.length === 0 ? (
                <div className="border-2 border-dashed rounded-2xl bg-gray-50 p-6 text-center">
                  <p className="text-sm text-gray-500">No address added yet</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3 max-w-[550px]">
                  {allAddresses.map((address: any) => (
                    <div
                      key={address.id}
                      onClick={() => setSelectedAddress(address.id)}
                      className={`rounded-xl border px-3 py-2.5 transition cursor-pointer ${
                        selectedAddress === address.id
                          ? "border-green-500 bg-green-50"
                          : "border-gray-200 bg-white hover:border-green-300"
                      }`}
                    >
                      {/* TOP */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-sm text-gray-800">
                              {address.fullName}
                            </h3>

                            {address.isDefault && (
                              <Badge className="bg-green-600 text-white rounded-full text-[9px] px-2 py-0 h-5">
                                Default
                              </Badge>
                            )}
                          </div>

                          <p className="text-[11px] text-gray-500 mt-0.5">
                            {address.phone}
                          </p>
                        </div>

                        <input
                          type="radio"
                          name="selectedAddress"
                          checked={selectedAddress === address.id}
                          onChange={() => setSelectedAddress(address.id)}
                          className="w-4 h-4 accent-green-600 mt-1"
                        />
                      </div>

                      {/* ADDRESS */}
                      <div className="mt-2 text-[11px] sm:text-xs text-gray-700 leading-4">
                        <p className="line-clamp-2">
                          {address.houseNo}, {address.area}
                        </p>

                        {address.landmark && (
                          <p className="mt-0.5">Landmark: {address.landmark}</p>
                        )}

                        <p className="mt-0.5">
                          {address.city}, {address.state} - {address.pincode}
                        </p>
                      </div>

                      {/* ACTIONS */}
                      <div className="flex items-center gap-4 mt-2">
                        <button className="text-[11px] text-green-600 font-medium hover:underline">
                          Edit
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemove(address.id);
                          }}
                          disabled={isPending}
                          className="text-[11px] text-red-500 font-medium hover:underline disabled:opacity-50"
                        >
                          {isPending ? "Removing..." : "Remove"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ORDER ITEMS */}
          <Card className="rounded-2xl sm:rounded-3xl border-0 shadow-sm">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base sm:text-xl font-bold text-gray-800">
                  Order Items
                </h2>

                <Badge className="bg-gray-100 text-gray-700 text-[10px] sm:text-xs">
                  {cartItems.length} Items
                </Badge>
              </div>

              <div className="flex flex-col gap-3">
                {cartItems.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex gap-3 border border-gray-100 rounded-2xl p-3 bg-white"
                  >
                    {/* IMAGE */}
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
                      <img
                        src={item.product.imageUrl}
                        alt={item.product.name}
                        className="w-full h-full object-contain p-2"
                      />
                    </div>

                    {/* INFO */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm sm:text-base text-gray-800 line-clamp-2">
                        {item.product.name}
                      </h3>

                      <p className="text-xs sm:text-sm text-gray-500 mt-1">
                        Qty: {item.quantity}
                      </p>

                      <p className="text-base sm:text-lg font-bold text-green-600 mt-2">
                        ₹{item.product.price * item.quantity}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT SIDE */}
        <div className="lg:sticky lg:top-24 h-fit">
          <Card className="rounded-2xl sm:rounded-3xl border-0 shadow-sm">
            <CardContent className="p-4 sm:p-5">
              <h2 className="text-base sm:text-xl font-bold text-gray-800 mb-5">
                Payment Summary
              </h2>

              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>

                  <span className="font-medium">₹{subtotal}</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Delivery Fee</span>

                  <span className="font-medium">
                    {deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`}
                  </span>
                </div>

                <div className="border-t pt-4 flex items-center justify-between">
                  <span className="font-bold text-gray-800">Total Amount</span>

                  <span className="text-xl sm:text-2xl font-bold text-green-600">
                    ₹{totalAmount}
                  </span>
                </div>
              </div>

              {/* PLACE ORDER */}
              <button className="w-full mt-6 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-2xl transition text-sm sm:text-base">
                Place Order
              </button>

              <p className="text-[10px] sm:text-xs text-center text-gray-400 mt-3">
                Safe & secure checkout experience
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default UserCheckoutPage;
