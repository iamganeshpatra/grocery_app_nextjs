"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { requestReturn } from "@/actions/return.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function ReturnForm({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error("Please give a reason");
      return;
    }
    startTransition(async () => {
      const result = await requestReturn(orderId, reason, description);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Return requested");
      router.push(`/customer/orders/${orderId}`);
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1">
        <label className="text-sm font-medium">
          Reason <span className="text-red-500">*</span>
        </label>
        <Input
          placeholder="e.g. Item damaged on arrival"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium">Description (optional)</label>
        <Textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Submitting…" : "Submit Return Request"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
