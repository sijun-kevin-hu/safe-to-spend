import type { Bill } from "@/types/bill";

export type SavingsMode = "amount" | "percentage";

export type PlanInput = {
  balance: number;
  savingsAmount: number | null;
  savingsPercentage: number | null;
  billItems: Bill[];
};

export type StoredPlan = PlanInput & {
  savingsReserved: number;
};

export function calculateSavingsReserved(
  balance: number,
  savingsAmount: number | null,
  savingsPercentage: number | null,
) {
  const amount = savingsPercentage === null
    ? savingsAmount ?? 0
    : Math.max(0, balance) * savingsPercentage / 100;
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function savingsSetting(mode: SavingsMode, value: string) {
  const parsedValue = value.trim() === "" ? null : Number(value);
  return mode === "amount"
    ? { savingsAmount: parsedValue, savingsPercentage: null }
    : { savingsAmount: null, savingsPercentage: parsedValue };
}

export function savingsError(mode: SavingsMode, value: string) {
  const amount = Number(value);
  if (mode === "percentage" && (!value.trim() || !Number.isFinite(amount) || amount < 0 || amount > 100)) {
    return "Enter a percentage from 0 to 100.";
  }
  if (!Number.isFinite(amount) || amount < 0) return "Enter a valid savings amount.";
  return "";
}
