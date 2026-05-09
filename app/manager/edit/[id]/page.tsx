import EditProductForm from "@/editProductForm";
import { prisma } from "@/lib/db";

const EditProduct = async ({ params }: { params: Promise<{ id: string }> }) => {

  const { id } = await params; // ✅ FIX

  const product = await prisma.product.findUnique({
    where: { id },
  });

  if (!product) {
    return (
      <div className="p-6">
        <h2 className="text-red-500 text-lg">Product not found</h2>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-xl font-bold mb-4">Edit Product</h1>
      <EditProductForm product={product} />
    </div>
  );
};

export default EditProduct;