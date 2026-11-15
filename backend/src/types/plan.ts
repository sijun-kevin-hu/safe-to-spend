import type { Bill } from "./bill";

export interface Plan {
  balance: number;
  trackingPreference: "purchases" | "balance" | null;
  balanceUpdatedAt: string | null;
  // Legacy purchases without a kind are treated as purchases.
  purchases: { id: string; amount: number; createdAt: string; note?: string | undefined;
    kind?: "purchase" | "income" | "balance_check_in" | undefined;
    balanceBefore?: number | null | undefined; balanceAfter?: number | undefined }[];
  savingsAmount: number | null;
  savingsPercentage: number | null;
  savingsReserved: number;
  billItems: Bill[];
}
