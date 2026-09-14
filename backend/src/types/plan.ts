import type { Bill } from "./bill";

export interface Plan {
  balance: number;
  savingsGoal: number;
  billItems: Bill[];
}
