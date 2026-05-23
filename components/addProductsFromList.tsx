"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { ShopProductWithProduct } from "@/lib/types";
import { toast } from "sonner";
import { Product } from "@/app/generated/prisma/client";
import ProductAddCard from "./product-add-to-cart";

type AddProductsFromListProps = {
  shopId: string;

  products: Product[];

  shopProducts: ShopProductWithProduct[];

  addProduct: (
    userId: string,
    productId: string,
    shopId: string,
  ) => Promise<ShopProductWithProduct>;

  updateProduct: (productId: string, stock: number) => Promise<void>;
};

const AddProductsFromList = ({
  shopId,
  products,
  shopProducts,
  addProduct,
  updateProduct,
}: AddProductsFromListProps) => {
  const { data: sessionproducts } = useSession();

  const [query, setQuery] = useState("");

  const [addedProducts, setAddedProducts] =
    useState<ShopProductWithProduct[]>(shopProducts);

  const [loading, setLoading] = useState(false);

  // sync products
  useEffect(() => {
    setAddedProducts(shopProducts);
  }, [shopProducts]);

  // search filter
  const filteredProducts = useMemo(() => {
    return products.filter(
      (item) =>
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        item.category.toLowerCase().includes(query.toLowerCase()),
    );
  }, [products, query]);

  // add product
  const handleAdd = async (productId: string) => {
    try {
      const product = products.find((p) => p.id === productId);

      if (!product) return;

      setLoading(true);

      const shopProduct = await addProduct(
        sessionproducts!.user.id,
        product.id,
        shopId
      );

      setAddedProducts((prev) => [...prev, shopProduct]);

      toast.success(`${product.name} added to your shop`);
    } catch (error) {
      toast.error("Failed to add product");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-5">
      {/* SEARCH */}
      <div className="mx-auto w-full max-w-xl">
        <input
          className="block w-full rounded-lg border border-gray-300 p-3 text-sm outline-none focus:border-black"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search product..."
        />
      </div>

      {/* LOADING */}
      {loading && (
        <p className="text-sm text-gray-500">Adding selected product...</p>
      )}

      {/* TWO LISTS */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ALL PRODUCTS */}
        <div className="rounded-xl border p-4">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-2xl font-bold">All Products</h1>

            <span className="rounded bg-gray-100 px-3 py-1 text-sm">
              Total: {products.length}
            </span>
          </div>

          <div className="flex max-h-[600px] flex-col gap-2 overflow-y-auto">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((item) => {
                const alreadyAdded = addedProducts.find(
                  (sp) => sp.productId === item.id,
                );

                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <h2 className="font-medium">{item.name}</h2>

                      <p className="text-sm text-gray-500">{item.category}</p>
                    </div>

                    <button
                      disabled={!!alreadyAdded}
                      onClick={() => handleAdd(item.id)}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-xl text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400"
                    >
                      +
                    </button>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-gray-500">No products found</p>
            )}
          </div>
        </div>

        {/* SELECTED PRODUCTS */}
        <div className="rounded-xl border p-4">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-2xl font-bold">Selected Products</h1>

            <span className="rounded bg-gray-100 px-3 py-1 text-sm">
              Total: {addedProducts.length}
            </span>
          </div>

          <div className="flex max-h-[600px] flex-col gap-3 overflow-y-auto">
            {addedProducts.length > 0 ? (
              addedProducts.map((sp) => (
                <ProductAddCard
                  key={sp.id}
                  product={sp}
                  updateShopProduct={updateProduct}
                />
              ))
            ) : (
              <p className="text-sm text-gray-500">No selected products</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddProductsFromList;
