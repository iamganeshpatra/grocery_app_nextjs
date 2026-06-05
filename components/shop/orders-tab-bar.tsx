"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

const TABS = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Active", value: "active" },
  { label: "Completed", value: "completed" },
];

export function OrdersTabBar({
  basePath,
  showReturns,
}: {
  basePath: string;
  showReturns?: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const current = params.get("tab") ?? "all";
  const tabs = showReturns
    ? [...TABS, { label: "Returns", value: "returns" }]
    : TABS;

  return (
    <div className="flex gap-2 mb-4 flex-wrap">
      {tabs.map((t) => (
        <Button
          key={t.value}
          size="sm"
          variant={current === t.value ? "default" : "outline"}
          onClick={() => router.push(`${basePath}?tab=${t.value}`)}
        >
          {t.label}
        </Button>
      ))}
    </div>
  );
}
