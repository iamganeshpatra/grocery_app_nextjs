"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function CategoryFilter({
  categories,
  current,
  query,
}: {
  categories: string[];
  current: string;
  query: string;
}) {
  const router = useRouter();

  function go(category: string) {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (category) params.set("category", category);
    router.push(`/customer?${params.toString()}`);
  }

  return (
    <div className="flex gap-2 flex-wrap">
      <Button
        size="sm"
        variant={current === "" ? "default" : "outline"}
        onClick={() => go("")}
      >
        All
      </Button>
      {categories.map((c) => (
        <Button
          key={c}
          size="sm"
          variant={current === c ? "default" : "outline"}
          onClick={() => go(c)}
        >
          {c}
        </Button>
      ))}
    </div>
  );
}
