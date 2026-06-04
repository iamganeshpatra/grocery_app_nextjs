import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { CartView } from "./components/cart-view";

export default async function CartPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/signin");

  const items = await prisma.cart.findMany({
    where: { userId: session.user.id },
    include: { product: true, shop: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  // Attach the live shop price + stock for each item
  const enriched = await Promise.all(
    items.map(async (item) => {
      const sp = await prisma.shopProduct.findUnique({
        where: {
          shopId_productId: { shopId: item.shopId, productId: item.productId },
        },
      });
      return {
        id: item.id,
        productName: item.product.name,
        shopName: item.shop.name,
        quantity: item.quantity,
        price: sp?.price ?? 0,
        stock: sp?.stock ?? 0,
      };
    }),
  );

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Your Cart</h1>
      <CartView initialItems={enriched} />
    </div>
  );
}
