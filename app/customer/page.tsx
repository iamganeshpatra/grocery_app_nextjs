import Link from "next/link"
import { prisma } from "@/lib/db"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CategoryFilter } from "@/components/customer/category-filter"

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>
}) {
  const { q = "", category = "" } = await searchParams

  const products = await prisma.product.findMany({
    where: {
      AND: [
        category ? { category } : {},
        q.trim()
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { category: { contains: q, mode: "insensitive" } },
              ],
            }
          : {},
      ],
    },
    orderBy: { name: "asc" },
  })

  // Lowest in-stock price per product, across all shops
  const inStock = await prisma.shopProduct.findMany({
    where: { stock: { gt: 0 }, productId: { in: products.map((p) => p.id) } },
    select: { productId: true, price: true },
  })
  const lowestPrice = new Map<string, number>()
  for (const sp of inStock) {
    const cur = lowestPrice.get(sp.productId)
    if (cur === undefined || sp.price < cur) lowestPrice.set(sp.productId, sp.price)
  }

  const categories = [...new Set((await prisma.product.findMany({ select: { category: true } })).map((p) => p.category))].sort()

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Browse Products</h1>

      <form className="mb-4">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search products…"
          className="w-full max-w-md border rounded-md px-3 py-2 text-sm bg-background"
        />
        {category && <input type="hidden" name="category" value={category} />}
      </form>

      <CategoryFilter categories={categories} current={category} query={q} />

      {products.length === 0 ? (
        <p className="text-muted-foreground mt-8">
          {q ? `No products found for "${q}". Try a different search.` : "No products available yet."}
        </p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
          {products.map((p) => {
            const from = lowestPrice.get(p.id)
            return (
              <Link key={p.id} href={`/customer/product/${p.id}`}>
                <Card className="hover:shadow-md transition-shadow h-full">
                  <CardContent className="p-3">
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imageUrl} alt={p.name} className="w-full h-32 object-cover rounded bg-muted mb-2" />
                    ) : (
                      <div className="w-full h-32 rounded bg-muted mb-2" />
                    )}
                    <p className="font-medium text-sm truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.brand ?? p.category} · {p.quantity}</p>
                    <div className="mt-2">
                      {from !== undefined ? (
                        <span className="text-sm font-semibold">From ₹{from}</span>
                      ) : (
                        <Badge variant="outline">Not available</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}