"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const TABS = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
  { label: "Returns", value: "returns" },
];

export function CustomerOrdersTabs({ current }: { current: string }) {
  const router = useRouter();
  return (
    <div className="flex gap-2 flex-wrap">
      {TABS.map((t) => (
        <Button
          key={t.value}
          size="sm"
          variant={current === t.value ? "default" : "outline"}
          onClick={() => router.push(`/customer/orders?tab=${t.value}`)}
        >
          {t.label}
        </Button>
      ))}
    </div>
  );
}
