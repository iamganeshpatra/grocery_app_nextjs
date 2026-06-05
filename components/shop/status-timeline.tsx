const STEPS = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "DISPATCHED",
  "DELIVERED",
] as const;

type HistoryEntry = {
  toStatus: string;
  changedAt: string;
  changedByName: string;
};

export function StatusTimeline({
  currentStatus,
  history,
}: {
  currentStatus: string;
  history: HistoryEntry[];
}) {
  // Map each step to its history entry (if reached)
  const reached = new Map(history.map((h) => [h.toStatus, h]));
  const currentIndex = STEPS.indexOf(currentStatus as (typeof STEPS)[number]);
  const isCancelled = currentStatus === "CANCELLED";

  return (
    <ol className="space-y-3">
      {STEPS.map((step, i) => {
        const entry = reached.get(step);
        const done = currentIndex >= i && !isCancelled;
        return (
          <li key={step} className="flex items-start gap-3">
            <div
              className={`mt-0.5 h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                done
                  ? "bg-green-600 text-white"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {done ? "✓" : i + 1}
            </div>
            <div>
              <p
                className={`text-sm font-medium ${done ? "" : "text-muted-foreground"}`}
              >
                {step}
              </p>
              {entry && (
                <p className="text-xs text-muted-foreground">
                  {new Date(entry.changedAt).toLocaleString("en-IN")} ·{" "}
                  {entry.changedByName}
                </p>
              )}
            </div>
          </li>
        );
      })}
      {isCancelled && (
        <li className="flex items-start gap-3">
          <div className="mt-0.5 h-5 w-5 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px] font-bold">
            ✕
          </div>
          <p className="text-sm font-medium text-red-700">CANCELLED</p>
        </li>
      )}
    </ol>
  );
}
