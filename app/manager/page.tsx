import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function ManagerDashboard() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/signin");

  const assignments = await prisma.shopManager.findMany({
    where: { userId: session.user.id },
    include: {
      shop: {
        include: {
          owner: { select: { name: true } },
          _count: { select: { shopProducts: true, orders: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-1">My Shops</h1>
      <p className="text-sm text-muted-foreground mb-6">
        {assignments.length} {assignments.length === 1 ? "shop" : "shops"} you
        manage
      </p>

      {assignments.length === 0 ? (
        <div className="text-center py-16 border rounded-lg bg-muted/20">
          <p className="text-muted-foreground">
            You are not assigned to any shops yet. Ask a shop owner to add you.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assignments.map(({ id, shop }) => (
            <Link key={id} href={`/manager/${shop.id}/products`}>
              <Card className="hover:shadow-md transition-shadow h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{shop.name}</CardTitle>
                  <Badge variant="secondary" className="w-fit">
                    {shop.category}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground mb-2">
                    Owner: {shop.owner.name}
                  </p>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>{shop._count.shopProducts} products</span>
                    <span>{shop._count.orders} orders</span>
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
