import type { Bill } from "./bill";

export interface Plan {
  balance: number;
  trackingPreference: "purchases" | "balance" | null;
  balanceUpdatedAt: string | null;
  purchases: { id: string; amount: number; createdAt: string }[];
  savingsAmount: number | null;
  savingsPercentage: number | null;
  savingsReserved: number;
  billItems: Bill[];
}
