"use client";

import { useEffect, useState } from "react";
import { Product, ShopProduct } from "../generated/prisma/client";
import ProductAddCard from "./product-add-card";
import { useSession } from "@/lib/auth-client";
import { ShopProductWithProduct } from "@/lib/types";
import { updateProduct } from "@/actions/product.action";
import { toast } from "sonner";

type AddProductsFromListProps = {
  products: Product[];
  shopProducts: ShopProductWithProduct[];
  addProduct: (
    userId: string,
    productId: string,
  ) => Promise<ShopProductWithProduct>;
  updateProduct: (productId: string, stock: number) => Promise<void>;
};
const AddProductsFromList = ({
  products,
  shopProducts,
  addProduct,
  updateProduct,
}: AddProductsFromListProps) => {
  const { data: sessionproducts } = useSession();
  const [query, setQuery] = useState("");
  const [matchedItems, setMatchedItems] = useState<Product[]>([]);
  const [addedProducts, setAddedProducts] =
    useState<ShopProductWithProduct[]>(shopProducts);
  const [loading, setLoading] = useState(false);
  const handleAdd = async (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    setLoading(true);
    const shopProduct = await addProduct(sessionproducts!.user.id, product.id);
    setAddedProducts([...addedProducts, shopProduct]);
    setLoading(false);
    toast.success(`${product.name} is added to your shop!!`);
  };
  const handleSearch = () => {
    const matches = products.filter(
      (i) =>
        i.name.toLowerCase().includes(query.toLowerCase()) ||
        i.category.toLowerCase().includes(query.toLowerCase()),
    );
    setMatchedItems(matches);
  };

  useEffect(() => {
    if (!query) return;
    handleSearch();
  }, [query]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="mx-auto w-lg">
          <input
            className="block w-full p-3 ps-9 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand shadow-xs placeholder:text-body"
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
            }}
            placeholder="Enter a product name"
          />
        </div>
        <div className="flex gap-2">
          {matchedItems.map((p) => (
            <div className="bg-gray-300 p-1" key={p.id}>
              {p.name}{" "}
              <button
                disabled={!!addedProducts.find((sp) => sp.productId === p.id)}
                className="p-2 bg-black text-white disabled:bg-gray-600 disabled:cursor-not-allowed"
                onClick={() => handleAdd(p.id)}
              >
                +
              </button>
            </div>
          ))}
        </div>
      </div>
      {loading ? "Adding selected product..." : ""}

      <div className="flex flex-col gap-2">
        {addedProducts.map((sp) => (
          <ProductAddCard
            key={sp.id}
            product={sp}
            updateShopProduct={updateProduct}
          />
        ))}
      </div>
    </div>
  );
};
export default AddProductsFromList;
