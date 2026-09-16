import { palette } from "@/constants/design";
import { toDateOnly } from "@/lib/format";
import type { CalendarDateFieldProps } from "./calendar-date-field";

export function CalendarDateField({
  value,
  onChange,
  accessibilityLabel,
  minimumDate,
  maximumDate,
  disabled,
}: CalendarDateFieldProps) {
  return (
    <input
      type="date"
      aria-label={accessibilityLabel}
      min={minimumDate ? toDateOnly(minimumDate) : undefined}
      max={maximumDate ? toDateOnly(maximumDate) : undefined}
      value={value ? toDateOnly(value) : ""}
      disabled={disabled}
      onChange={(event) => {
        const input = event.currentTarget;
        if (!input.value || !input.validity.valid) return;
        const [year, month, day] = input.value.split("-").map(Number);
        onChange(new Date(year, month - 1, day));
      }}
      style={{
        minHeight: 48,
        width: "100%",
        boxSizing: "border-box",
        padding: 12,
        border: `1px solid ${palette.border}`,
        borderRadius: 12,
        background: palette.surface,
        color: palette.text,
        font: "inherit",
        colorScheme: "light",
      }}
    />
  );
}
