import { Product, ShopProduct } from "@/app/generated/prisma/client";

export type ShopProductWithProduct = ShopProduct & {product: Product}