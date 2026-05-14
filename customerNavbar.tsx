import { prisma } from "@/lib/db";
import { Menu, Search, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const CustomerNavbar = async () => {

  // ✅ GET CURRENT USER SESSION
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const user = session?.user;

  // ❌ if not logged in → no cart shown
  if (!user) {
    return (
      <nav className="flex items-center justify-between px-4 py-3 shadow-md bg-white">
        <h1 className="text-lg font-bold text-green-600">MyMart</h1>

        <Link href="/signin" className="text-sm text-blue-600">
          Login
        </Link>
      </nav>
    );
  }

  // ✅ ONLY THIS USER'S CART
  const cartItems = await prisma.cart.findMany({
    where: {
      userId: user.id,   // 🔥 IMPORTANT FIX
    },
  });

  // total items for THIS USER only
  const totalItems = cartItems.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  return (
    <nav className="flex items-center justify-between px-4 py-3 shadow-md bg-white sticky top-0 z-50">

      {/* Left */}
      <div className="flex items-center gap-3">
        <Menu className="w-6 h-6 cursor-pointer" />
        <h1 className="text-lg font-bold text-green-600">MyMart</h1>
      </div>

      {/* Search */}
      <div className="flex items-center bg-gray-100 px-3 py-2 rounded-lg w-1/2">
        <Search className="w-5 h-5 text-gray-500" />
        <input
          type="text"
          placeholder="Search for products..."
          className="bg-transparent outline-none px-2 w-full"
        />
      </div>

      {/* Right */}
      <div className="flex items-center gap-4">

        <Link href="/customer/cart">
          <div className="relative cursor-pointer">
            <ShoppingBag className="w-6 h-6" />

            {totalItems > 0 && (
              <span className="absolute -top-2 -right-2 bg-green-600 text-white text-xs px-1.5 rounded-full">
                {totalItems > 99?"99+":totalItems}
              </span>
            )}
          </div>
        </Link>

      </div>

    </nav>
  );
};

export default CustomerNavbar;