"use client";

export function StarDisplay({
  rating,
  max = 5,
}: {
  rating: number;
  max?: number;
}) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          className={
            i < Math.round(rating) ? "text-yellow-400" : "text-gray-300"
          }
        >
          ★
        </span>
      ))}
    </div>
  );
}

export function StarPicker({
  value,
  onChange,
  max = 5,
}: {
  value: number;
  onChange: (rating: number) => void;
  max?: number;
}) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: max }, (_, i) => {
        const star = i + 1;
        return (
          <button
            key={i}
            type="button"
            onClick={() => onChange(star)}
            className={`text-2xl transition-colors ${star <= value ? "text-yellow-400" : "text-gray-300"} hover:text-yellow-400`}
          >
            ★
          </button>
        );
      })}
    </div>
  );
}
