import { palette } from "@/constants/design";
import { toDateOnly } from "@/lib/format";
import type { DueDateFieldProps } from "./due-date-field";

export function DueDateField({ value, onChange }: DueDateFieldProps) {
  return (
    <input
      type="date"
      aria-label="Due date"
      min={toDateOnly(new Date())}
      value={value ? toDateOnly(value) : ""}
      onChange={(event) => {
        const input = event.currentTarget;
        if (!input.value || !input.validity.valid) return;
        const [year, month, day] = input.value.split("-").map(Number);
        onChange(new Date(year, month - 1, day));
      }}
      style={{ minHeight: 48, width: "100%", boxSizing: "border-box", padding: 12,
        border: `1px solid ${palette.border}`, borderRadius: 12, background: palette.surface,
        color: palette.text, font: "inherit", colorScheme: "light" }}
    />
  );
}
