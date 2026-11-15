import type { Bill } from "@/types/bill";

export type TrackingPreference = "purchases" | "balance";
export type TransactionKind = "purchase" | "income";
export type ActivityEntry = {
  id: string; amount: number; createdAt: string; note?: string;
  // Entries saved before income logging have no kind and remain purchases.
  kind?: TransactionKind | "balance_check_in" | "savings_transfer";
  balanceBefore?: number | null;
  balanceAfter?: number;
  savingsAllocated?: number;
  savingsSavedAt?: string;
  savingsSourceId?: string;
  historyOnly?: boolean;
};
export type Transaction = Omit<ActivityEntry, "kind"> & { kind?: TransactionKind };
export type TrackingState = {
  activityRevision?: number;
  balance: number;
  balanceUpdatedAt: string | null;
  // Keep the existing API/JSONB field name for compatibility.
  purchases: ActivityEntry[];
  incomeSavingsReserved?: number;
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

export function recordTransaction(state: TrackingState, transaction: Transaction, savingsIncomePercentage: number | null = null, savingsIncomeAmount: number | null = null): TrackingState {
  const kind = transaction.kind ?? "purchase";
  if (kind !== "purchase" && kind !== "income") throw new Error("Choose purchase or income.");
  if (!Number.isFinite(transaction.amount) || transaction.amount < 0.01 || transaction.amount > 1e12) {
    throw new Error(`Enter a valid ${kind} amount of at least $0.01.`);
  }
  if (state.purchases.some((item) => item.id === transaction.id)) return state;
  if (savingsIncomePercentage !== null && (!Number.isFinite(savingsIncomePercentage) || savingsIncomePercentage < 0 || savingsIncomePercentage > 100)) {
    throw new Error("Enter a percentage from 0 to 100.");
  }
  const amount = Math.round(transaction.amount * 100) / 100;
  const balance = Math.round((state.balance + (kind === "income" ? amount : -amount)) * 100) / 100;
  if (!Number.isFinite(balance)) throw new Error("Enter a smaller amount.");
  if (savingsIncomeAmount !== null && (!Number.isFinite(savingsIncomeAmount) || savingsIncomeAmount < 0)) throw new Error("Enter a valid amount.");
  const allocate = kind === "income" && (savingsIncomePercentage !== null || savingsIncomeAmount !== null);
  const savingsAllocated = allocate ? savingsIncomeAmount !== null ? Math.min(amount, Math.round(savingsIncomeAmount * 100) / 100) : Math.round(amount * savingsIncomePercentage!) / 100 : 0;
  const incomeSavingsReserved = Math.round(((state.incomeSavingsReserved ?? 0) + savingsAllocated) * 100) / 100;
  if (!Number.isFinite(incomeSavingsReserved)) throw new Error("Enter a smaller amount.");
  return { ...state, balance, purchases: [{ ...transaction, amount,
    balanceBefore: state.balance, balanceAfter: balance,
    ...(allocate ? { savingsAllocated } : {}) }, ...state.purchases],
    ...(allocate ? { incomeSavingsReserved } : {}) };
}

export function recordPurchase(state: TrackingState, purchase: Omit<Transaction, "kind">): TrackingState {
  return recordTransaction(state, purchase);
}

export type SavingsMode = "amount" | "percentage" | "income" | "incomeAmount";

export type PlanInput = {
  activityRevision?: number;
  balance: number;
  trackingPreference: TrackingPreference | null;
  balanceUpdatedAt: string | null;
  purchases: ActivityEntry[];
  savingsAmount: number | null;
  savingsPercentage: number | null;
  savingsIncomePercentage?: number | null;
  savingsIncomeAmount?: number | null;
  incomeSavingsReserved?: number;
  billItems: Bill[];
};

export type StoredPlan = PlanInput & {
  supportsActivityEditing?: boolean;
  supportsCsvImport?: boolean;
  savingsReserved: number;
  supportsIncome: boolean;
  supportsRecurringBills: boolean;
  supportsIncomeSavings: boolean;
  supportsSavingsTasks?: boolean;
};

// Default only an untouched plan; never change an existing savings choice.
export function initialSavingsChoice(plan: StoredPlan): { mode: SavingsMode; value: string } {
  if (plan.savingsIncomeAmount != null) return { mode: "incomeAmount", value: String(plan.savingsIncomeAmount) };
  if (plan.savingsIncomePercentage != null) return { mode: "income", value: String(plan.savingsIncomePercentage) };
  if (plan.savingsPercentage != null) return { mode: "percentage", value: String(plan.savingsPercentage) };
  if (plan.savingsAmount != null) return { mode: "amount", value: String(plan.savingsAmount) };
  if (plan.supportsIncomeSavings && plan.balanceUpdatedAt === null && plan.purchases.length === 0 && plan.balance === 0) {
    return { mode: "income", value: "10" };
  }
  return { mode: "amount", value: "" };
}

export function calculateSavingsReserved(
  balance: number,
  savingsAmount: number | null,
  savingsPercentage: number | null,
  savingsIncomePercentage: number | null = null,
  incomeSavingsReserved = 0,
) {
  const amount = savingsIncomePercentage !== null ? incomeSavingsReserved : savingsPercentage === null
    ? savingsAmount ?? 0
    : Math.max(0, balance) * savingsPercentage / 100;
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function savingsSetting(mode: SavingsMode, value: string): {
  savingsAmount: number | null; savingsPercentage: number | null; savingsIncomePercentage?: number | null; savingsIncomeAmount?: number | null;
} {
  const parsedValue = value.trim() === "" ? null : Number(value);
  if (mode === "incomeAmount") return { savingsAmount: null, savingsPercentage: null, savingsIncomeAmount: parsedValue };
  if (mode === "income") return { savingsAmount: null, savingsPercentage: null, savingsIncomePercentage: parsedValue };
  return mode === "amount"
    ? { savingsAmount: parsedValue, savingsPercentage: null }
    : { savingsAmount: null, savingsPercentage: parsedValue };
}

export function savingsError(mode: SavingsMode, value: string) {
  const amount = Number(value);
  if (mode === "incomeAmount" && !value.trim()) return "Enter an amount per income.";
  if (mode !== "amount" && mode !== "incomeAmount" && (!value.trim() || !Number.isFinite(amount) || amount < 0 || amount > 100)) {
    return "Enter a percentage from 0 to 100.";
  }
  if (!Number.isFinite(amount) || amount < 0) return "Enter a valid savings amount.";
  return "";
}

export type SavingsTask = { id: string; amount: number; createdAt?: string; incomeAmount?: number; savedAt?: string };
export function savingsTasks(state: TrackingState): SavingsTask[] {
  const tasks: SavingsTask[] = state.purchases.filter(e => e.kind === "income" && (e.savingsAllocated ?? 0) > 0)
    .map(e => ({ id: e.id, amount: e.savingsAllocated!, createdAt: e.createdAt, incomeAmount: e.amount, savedAt: e.savingsSavedAt }));
  tasks.push(...state.purchases.filter(e => e.kind === "savings_transfer" && e.savingsSourceId === "carryover")
    .map(e => ({ id: e.id, amount: e.amount, createdAt: e.createdAt, incomeAmount: undefined, savedAt: e.createdAt })));
  const pending = tasks.filter(t => !t.savedAt).reduce((sum,t) => sum + t.amount, 0);
  const carryover = Math.round(((state.incomeSavingsReserved ?? 0) - pending) * 100) / 100;
  return carryover > 0 ? [...tasks, { id: "carryover", amount: carryover }] : tasks;
}
export function markSavingsSaved(state: TrackingState, sourceId: string, now: string): TrackingState {
  const task = savingsTasks(state).find(t => t.id === sourceId);
  if (!task || task.savedAt) return state;
  if (task.amount > (state.incomeSavingsReserved ?? 0) || task.amount > state.balance) throw new Error("Check your balance before moving this amount.");
  const balance = Math.round((state.balance - task.amount) * 100) / 100;
  const transfer: ActivityEntry = { id: sourceId === "carryover" ? `saved-carryover-${now}` : `saved-${sourceId}`, kind: "savings_transfer", amount: task.amount,
    createdAt: now, balanceBefore: state.balance, balanceAfter: balance, savingsSourceId: sourceId };
  if (state.purchases.some(e => e.id === transfer.id)) return state;
  return { ...state, balance, incomeSavingsReserved: Math.round(((state.incomeSavingsReserved ?? 0) - task.amount) * 100) / 100,
    purchases: [transfer, ...state.purchases.map(e => e.id === sourceId ? { ...e, savingsSavedAt: now } : e)] };
}
