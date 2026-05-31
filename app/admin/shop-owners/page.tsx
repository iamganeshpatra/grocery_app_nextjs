import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";

export default async function ShopOwnersPage() {
  const owners = await prisma.user.findMany({
    where: { role: "SHOP_OWNER" },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { shops: true } } },
  });

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Shop Owners</h1>
      {owners.length === 0 ? (
        <p className="text-muted-foreground">No shop owners yet.</p>
      ) : (
        <div className="space-y-2">
          {owners.map((o) => (
            <Link key={o.id} href={`/admin/shop-owners/${o.id}`}>
              <Card className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4 flex justify-between items-center">
                  <div>
                    <p className="font-medium">{o.name}</p>
                    <p className="text-sm text-muted-foreground">{o.email}</p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {o._count.shops} {o._count.shops === 1 ? "shop" : "shops"}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
