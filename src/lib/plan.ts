import type { Bill } from "@/types/bill";

export type TrackingPreference = "purchases" | "balance";
export type Purchase = { id: string; amount: number; createdAt: string; note?: string };
export type TrackingState = {
  balance: number;
  balanceUpdatedAt: string | null;
  purchases: Purchase[];
};

// The balance already includes logged purchases. A check-in replaces it outright.
export function updateTrackingBalance(state: TrackingState, balance: number, now: string): TrackingState {
  if (!Number.isFinite(balance)) throw new Error("Enter a valid balance.");
  return { ...state, balance: Math.round(balance * 100) / 100, balanceUpdatedAt: now };
}

export function recordPurchase(state: TrackingState, purchase: Purchase): TrackingState {
  if (!Number.isFinite(purchase.amount) || purchase.amount < 0.01) {
    throw new Error("Enter a purchase amount of at least $0.01.");
  }
  if (state.purchases.some((item) => item.id === purchase.id)) return state;
  const balance = Math.round((state.balance - purchase.amount) * 100) / 100;
  if (!Number.isFinite(balance)) throw new Error("Enter a smaller purchase amount.");
  return { ...state, balance, purchases: [purchase, ...state.purchases] };
}

export type SavingsMode = "amount" | "percentage";

export type PlanInput = {
  balance: number;
  trackingPreference: TrackingPreference | null;
  balanceUpdatedAt: string | null;
  purchases: Purchase[];
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
