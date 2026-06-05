"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { submitReview } from "@/actions/review.actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StarPicker } from "@/components/shared/star-rating";

export function FeedbackForm({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (rating < 1) {
      toast.error("Pick a star rating");
      return;
    }
    if (comment.length > 500) {
      toast.error("Comment must be 500 characters or fewer");
      return;
    }
    startTransition(async () => {
      const result = await submitReview(orderId, rating, comment);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Feedback submitted. Thank you!");
      router.push(`/customer/orders/${orderId}`);
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1">
        <label className="text-sm font-medium">
          Rating <span className="text-red-500">*</span>
        </label>
        <StarPicker value={rating} onChange={setRating} />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium">
          Comment (optional, max 500)
        </label>
        <Textarea
          rows={4}
          maxLength={500}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Submitting…" : "Submit Feedback"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
