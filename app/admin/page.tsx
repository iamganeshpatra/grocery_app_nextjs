import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminDashboard() {
  const [products, shopOwners, shops, customers, orders, revenueAgg] =
    await Promise.all([
      prisma.product.count(),
      prisma.user.count({ where: { role: "SHOP_OWNER" } }),
      prisma.shop.count(),
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      prisma.order.count(),
      prisma.order.aggregate({
        where: { status: "DELIVERED" },
        _sum: { totalAmount: true },
      }),
    ]);

  const stats = [
    { label: "Products in Catalog", value: products },
    { label: "Shop Owners", value: shopOwners },
    { label: "Shops", value: shops },
    { label: "Customers", value: customers },
    { label: "Total Orders", value: orders },
    {
      label: "Revenue (Delivered)",
      value: `₹${(revenueAgg._sum.totalAmount ?? 0).toLocaleString("en-IN")}`,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Platform Overview</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {s.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
