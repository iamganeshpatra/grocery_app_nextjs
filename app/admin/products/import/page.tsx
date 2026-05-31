import Link from "next/link";
import { ImportForm } from "./components/import-form";

export default function ImportPage() {
  return (
    <div className="max-w-3xl mx-auto p-6">
      <Link
        href="/admin/products"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to Catalog
      </Link>
      <h1 className="text-2xl font-bold mt-2 mb-1">Bulk Import Products</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Upload a CSV with the header row:{" "}
        <code>name,category,brand,price,unit</code>
      </p>
      <ImportForm />
    </div>
  );
}
