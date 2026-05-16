import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import UserCheckoutPage from "./userCheckout";

const CheckoutPage = async () => {
  // ✅ SESSION
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const sessionUser = session?.user;

  if (!sessionUser) {
    redirect("/signin");
  }

  // ✅ USER
  const user = await prisma.user.findUnique({
    where: {
      id: sessionUser.id,
    },
  });

  if (!user) {
    redirect("/signin");
  }

  // ✅ ADDRESSES
  const addresses = await prisma.address.findMany({
    where: {
      userId: user.id,
    },
    orderBy: {
      isDefault: "desc",
    },
  });

  // ✅ CART ITEMS
  const cartItems = await prisma.cart.findMany({
    where: {
      userId: user.id,
    },
    include: {
      product: true,
    },
  });

  // ✅ TOTALS
  const subtotal = cartItems.reduce(
    (acc, item) => acc + item.product.price * item.quantity,
    0,
  );

  const deliveryFee = subtotal > 500 ? 0 : 9;

  const totalAmount = subtotal + deliveryFee;

  return (
    <UserCheckoutPage
      user={user}
      addresses={addresses}
      cartItems={cartItems}
      subtotal={subtotal}
      deliveryFee={deliveryFee}
      totalAmount={totalAmount}
    />
  );
};

export default CheckoutPage;
