import type { Bill } from "./bill";

export interface Plan {
  balance: number;
  savingsAmount: number | null;
  savingsPercentage: number | null;
  savingsReserved: number;
  billItems: Bill[];
}
