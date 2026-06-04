import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { CheckoutView } from "./components/checkout-view";

export default async function CheckoutPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/signin");
  const userId = session.user.id;

  const [addresses, cartItems] = await Promise.all([
    prisma.address.findMany({
      where: { userId },
      orderBy: { isDefault: "desc" },
    }),
    prisma.cart.findMany({
      where: { userId },
      include: { product: true, shop: { select: { name: true } } },
    }),
  ]);

  if (cartItems.length === 0) {
    return (
      <div className="max-w-3xl mx-auto p-6 text-center">
        <p className="text-muted-foreground mb-4">Your cart is empty.</p>
        <Link href="/customer" className="underline">
          Browse products
        </Link>
      </div>
    );
  }

  // Price each line + group by shop for the summary
  const lines = await Promise.all(
    cartItems.map(async (item) => {
      const sp = await prisma.shopProduct.findUnique({
        where: {
          shopId_productId: { shopId: item.shopId, productId: item.productId },
        },
      });
      return {
        shopName: item.shop.name,
        productName: item.product.name,
        quantity: item.quantity,
        price: sp?.price ?? 0,
      };
    }),
  );

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Checkout</h1>
      <CheckoutView addresses={addresses} lines={lines} />
    </div>
  );
}
