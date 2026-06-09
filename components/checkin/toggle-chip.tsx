"use client";

import { cn } from "@/lib/utils";

// Tri-state boolean chip: null (unanswered) -> true -> false -> null.
export function ToggleChip({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean | null;
  onChange: (v: boolean | null) => void;
}) {
  function cycle() {
    onChange(value === null ? true : value === true ? false : null);
  }
  return (
    <button
      type="button"
      onClick={cycle}
      className={cn(
        "flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
        value === true && "border-primary bg-primary text-primary-foreground",
        value === false && "border-input bg-muted text-muted-foreground line-through",
        value === null && "border-input hover:bg-muted",
      )}
    >
      <span>{label}</span>
      <span className="text-xs opacity-70">
        {value === true ? "Yes" : value === false ? "No" : "-"}
      </span>
    </button>
  );
}
