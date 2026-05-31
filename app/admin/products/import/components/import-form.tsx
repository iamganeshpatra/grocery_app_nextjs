"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { bulkCreateProducts } from "@/actions/admin.actions";
import { Button } from "@/components/ui/button";

type Row = {
  name: string;
  category: string;
  brand: string;
  price: number;
  quantity: string;
};

// Minimal CSV parser — handles simple comma-separated values (no quoted commas)
function parseCsv(text: string): Row[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const idx = {
    name: header.indexOf("name"),
    category: header.indexOf("category"),
    brand: header.indexOf("brand"),
    price: header.indexOf("price"),
    unit: header.indexOf("unit"),
  };

  return lines.slice(1).map((line) => {
    const cols = line.split(",");
    return {
      name: cols[idx.name]?.trim() ?? "",
      category: cols[idx.category]?.trim() ?? "",
      brand: cols[idx.brand]?.trim() ?? "",
      price: parseFloat(cols[idx.price]?.trim() ?? "0"),
      quantity: cols[idx.unit]?.trim() ?? "1 unit",
    };
  });
}

export function ImportForm() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [fileName, setFileName] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseCsv(String(reader.result));
      if (parsed.length === 0) {
        toast.error("No rows found. Check the header row.");
        return;
      }
      setRows(parsed);
    };
    reader.readAsText(file);
  }

  const validCount = rows.filter(
    (r) => r.name && r.category && r.price > 0,
  ).length;
  const invalidCount = rows.length - validCount;

  function handleImport() {
    startTransition(async () => {
      const result = await bulkCreateProducts(rows);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(
        `Imported ${result.data!.created} products (${result.data!.skipped} skipped)`,
      );
      router.push("/admin/products");
    });
  }

  return (
    <div className="space-y-4">
      <input
        type="file"
        accept=".csv,text/csv"
        onChange={handleFile}
        className="block text-sm"
      />

      {rows.length > 0 && (
        <>
          <div className="text-sm">
            <span className="font-medium">{fileName}</span> — {validCount}{" "}
            valid,{" "}
            {invalidCount > 0 && (
              <span className="text-orange-600">
                {invalidCount} will be skipped
              </span>
            )}
          </div>

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Category</th>
                  <th className="text-left p-2">Brand</th>
                  <th className="text-left p-2">Price</th>
                  <th className="text-left p-2">Unit</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 50).map((r, i) => {
                  const valid = r.name && r.category && r.price > 0;
                  return (
                    <tr
                      key={i}
                      className={valid ? "border-t" : "border-t bg-red-50"}
                    >
                      <td className="p-2">{r.name}</td>
                      <td className="p-2">{r.category}</td>
                      <td className="p-2">{r.brand}</td>
                      <td className="p-2">₹{r.price}</td>
                      <td className="p-2">{r.quantity}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Button
            onClick={handleImport}
            disabled={isPending || validCount === 0}
          >
            {isPending ? "Importing…" : `Import ${validCount} Products`}
          </Button>
        </>
      )}
    </div>
  );
}
