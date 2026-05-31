"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const TABS = [
  { label: "All", value: "" },
  { label: "Pending", value: "PENDING" },
  { label: "Approved", value: "APPROVED" },
  { label: "Rejected", value: "REJECTED" },
];

export function ReturnsFilter({ current }: { current: string }) {
  const router = useRouter();
  return (
    <div className="flex gap-2">
      {TABS.map((t) => (
        <Button
          key={t.value}
          size="sm"
          variant={current === t.value ? "default" : "outline"}
          onClick={() =>
            router.push(
              t.value ? `/admin/returns?status=${t.value}` : "/admin/returns",
            )
          }
        >
          {t.label}
        </Button>
      ))}
    </div>
  );
}
