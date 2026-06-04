import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AddToCartCard } from "@/components/customer/add-to-cart-card";
import { StarDisplay } from "@/components/shared/star-rating";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) notFound();

  const shopProducts = await prisma.shopProduct.findMany({
    where: { productId },
    include: { shop: { select: { id: true, name: true, category: true } } },
    orderBy: { price: "asc" },
  });

  // Average rating per shop for THIS product
  const ratings = await prisma.productReview.groupBy({
    by: ["shopId"],
    where: { productId },
    _avg: { rating: true },
    _count: { rating: true },
  });
  const ratingByShop = new Map(
    ratings.map((r) => [
      r.shopId,
      { avg: r._avg.rating ?? 0, count: r._count.rating },
    ]),
  );

  // All reviews for this product (across shops)
  const reviews = await prisma.productReview.findMany({
    where: { productId },
    include: {
      customer: { select: { name: true } },
      shop: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Link
        href="/customer"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to Browse
      </Link>

      <div className="flex flex-col md:flex-row gap-6 mt-4">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full md:w-64 h-64 object-cover rounded bg-muted"
          />
        ) : (
          <div className="w-full md:w-64 h-64 rounded bg-muted" />
        )}
        <div>
          <h1 className="text-2xl font-bold">{product.name}</h1>
          <p className="text-sm text-muted-foreground">
            {product.brand ?? product.category} · {product.quantity}
          </p>
          <Badge variant="secondary" className="mt-2">
            {product.category}
          </Badge>
          {product.description && (
            <p className="text-sm mt-3">{product.description}</p>
          )}
        </div>
      </div>

      {/* Shops offering this product */}
      <h2 className="text-lg font-semibold mt-8 mb-3">Available at</h2>
      {shopProducts.length === 0 ? (
        <p className="text-muted-foreground">
          No shops are currently offering this product.
        </p>
      ) : (
        <div className="space-y-3">
          {shopProducts.map((sp) => {
            const rating = ratingByShop.get(sp.shop.id);
            return (
              <AddToCartCard
                key={sp.id}
                productId={product.id}
                shopId={sp.shop.id}
                shopName={sp.shop.name}
                shopCategory={sp.shop.category}
                price={sp.price}
                stock={sp.stock}
                avgRating={rating?.avg ?? 0}
                ratingCount={rating?.count ?? 0}
              />
            );
          })}
        </div>
      )}

      {/* Reviews */}
      <h2 className="text-lg font-semibold mt-8 mb-3">Customer Reviews</h2>
      {reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">No reviews yet.</p>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{r.customer.name}</span>
                  <StarDisplay rating={r.rating} />
                </div>
                <p className="text-xs text-muted-foreground">{r.shop.name}</p>
                {r.comment && <p className="text-sm mt-1">{r.comment}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
