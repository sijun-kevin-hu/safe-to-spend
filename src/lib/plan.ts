import type { Bill } from "@/types/bill";

export type TrackingPreference = "purchases" | "balance";
export type TransactionKind = "purchase" | "income";
export type ActivityEntry = {
  id: string; amount: number; createdAt: string; note?: string;
  // Entries saved before income logging have no kind and remain purchases.
  kind?: TransactionKind | "balance_check_in";
  balanceBefore?: number | null;
  balanceAfter?: number;
};
export type Transaction = Omit<ActivityEntry, "kind"> & { kind?: TransactionKind };
export type TrackingState = {
  balance: number;
  balanceUpdatedAt: string | null;
  // Keep the existing API/JSONB field name for compatibility.
  purchases: ActivityEntry[];
};

// The balance already includes logged transactions. A check-in replaces it outright.
export function updateTrackingBalance(state: TrackingState, balance: number, now: string,
  id = `balance-${now}-${balance}`): TrackingState {
  if (!Number.isFinite(balance)) throw new Error("Enter a valid balance.");
  if (state.purchases.some((item) => item.id === id)) return state;
  const balanceAfter = Math.round(balance * 100) / 100;
  const balanceBefore = state.balanceUpdatedAt === null ? null : state.balance;
  const entry: ActivityEntry = { id, kind: "balance_check_in", createdAt: now,
    amount: balanceBefore === null ? 0 : Math.round((balanceAfter - balanceBefore) * 100) / 100,
    balanceBefore, balanceAfter };
  return { ...state, balance: balanceAfter, balanceUpdatedAt: now, purchases: [entry, ...state.purchases] };
}

export function recordTransaction(state: TrackingState, transaction: Transaction): TrackingState {
  const kind = transaction.kind ?? "purchase";
  if (kind !== "purchase" && kind !== "income") throw new Error("Choose purchase or income.");
  if (!Number.isFinite(transaction.amount) || transaction.amount < 0.01 || transaction.amount > 1e12) {
    throw new Error(`Enter a valid ${kind} amount of at least $0.01.`);
  }
  if (state.purchases.some((item) => item.id === transaction.id)) return state;
  const amount = Math.round(transaction.amount * 100) / 100;
  const balance = Math.round((state.balance + (kind === "income" ? amount : -amount)) * 100) / 100;
  if (!Number.isFinite(balance)) throw new Error("Enter a smaller amount.");
  return { ...state, balance, purchases: [{ ...transaction, amount,
    balanceBefore: state.balance, balanceAfter: balance }, ...state.purchases] };
}

export function recordPurchase(state: TrackingState, purchase: Omit<Transaction, "kind">): TrackingState {
  return recordTransaction(state, purchase);
}

export type SavingsMode = "amount" | "percentage";

export type PlanInput = {
  balance: number;
  trackingPreference: TrackingPreference | null;
  balanceUpdatedAt: string | null;
  purchases: ActivityEntry[];
  savingsAmount: number | null;
  savingsPercentage: number | null;
  billItems: Bill[];
};

export type StoredPlan = PlanInput & {
  savingsReserved: number;
  supportsIncome: boolean;
  supportsRecurringBills: boolean;
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
