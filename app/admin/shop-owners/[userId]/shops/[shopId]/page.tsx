import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function AdminShopDetailPage({
  params,
}: {
  params: Promise<{ userId: string; shopId: string }>;
}) {
  const { userId, shopId } = await params;
  const shop = await prisma.shop.findFirst({
    where: { id: shopId, ownerId: userId },
    include: {
      shopProducts: { include: { product: true } },
      shopManagers: {
        include: { user: { select: { name: true, email: true } } },
      },
      orders: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!shop) notFound();

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div>
        <Link
          href={`/admin/shop-owners/${userId}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to Owner
        </Link>
        <h1 className="text-2xl font-bold mt-2">{shop.name}</h1>
        <p className="text-sm text-muted-foreground">{shop.category}</p>
        <Badge variant="outline" className="mt-2">
          Read-only
        </Badge>
      </div>

      {/* Products */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Inventory ({shop.shopProducts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {shop.shopProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No products.</p>
          ) : (
            <div className="space-y-1 text-sm">
              {shop.shopProducts.map((sp) => (
                <div
                  key={sp.id}
                  className="flex justify-between border-b last:border-0 py-1"
                >
                  <span>{sp.product.name}</span>
                  <span className="text-muted-foreground">
                    ₹{sp.price} · {sp.stock} in stock
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Managers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Managers ({shop.shopManagers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {shop.shopManagers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No managers.</p>
          ) : (
            <div className="space-y-1 text-sm">
              {shop.shopManagers.map((m) => (
                <div
                  key={m.id}
                  className="flex justify-between border-b last:border-0 py-1"
                >
                  <span>{m.user.name}</span>
                  <span className="text-muted-foreground">{m.user.email}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {shop.orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No orders.</p>
          ) : (
            <div className="space-y-1 text-sm">
              {shop.orders.map((o) => (
                <div
                  key={o.id}
                  className="flex justify-between border-b last:border-0 py-1"
                >
                  <span className="font-mono text-xs">#{o.id.slice(-6)}</span>
                  <span>₹{o.totalAmount}</span>
                  <Badge variant="secondary">{o.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
