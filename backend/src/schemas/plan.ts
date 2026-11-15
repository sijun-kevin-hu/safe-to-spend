import z = require("zod");
import { billSchema } from "./bill";

const planInputSchema = z.object({
  balance: z.number(),
  trackingPreference: z.enum(["purchases", "balance"]).nullable().default(null),
  balanceUpdatedAt: z.iso.datetime().nullable().default(null),
  purchases: z.array(z.object({
    id: z.string().min(1).max(100),
    amount: z.number(),
    createdAt: z.iso.datetime(),
    note: z.string().trim().max(120).optional(),
    kind: z.enum(["purchase", "income", "balance_check_in"]).optional(),
    balanceBefore: z.number().nullable().optional(),
    balanceAfter: z.number().optional(),
    savingsAllocated: z.number().nonnegative().optional(),
  }).refine((item) => {
    if (item.savingsAllocated !== undefined && (item.kind !== "income" || item.savingsAllocated > item.amount)) return false;
    const checkIn = item.kind === "balance_check_in";
    if (!checkIn && item.amount < 0.01) return false;
    const hasBalances = item.balanceBefore !== undefined || item.balanceAfter !== undefined;
    if (!hasBalances) return !checkIn; // Legacy purchases/income have no snapshots.
    if (item.balanceBefore === undefined || item.balanceAfter === undefined) return false;
    if (item.balanceBefore === null) return checkIn && item.amount === 0;
    const change = Math.round((item.balanceAfter - item.balanceBefore) * 100) / 100;
    return change === (checkIn || item.kind === "income" ? item.amount : -item.amount);
  }, { message: "Activity balance details must match the recorded change." })).refine((items) => new Set(items.map((item) => item.id)).size === items.length,
    { message: "Transaction IDs must be unique." }).default([]),
  savingsAmount: z.number().nonnegative().nullable().default(null),
  savingsPercentage: z.number().min(0).max(100).nullable().default(null),
  savingsIncomePercentage: z.number().min(0).max(100).nullable().default(null),
  incomeSavingsReserved: z.number().nonnegative().default(0),
  billItems: z.array(billSchema).refine((items) => new Set(items.map((bill) => bill.id)).size === items.length,
    { message: "Bill IDs must be unique." }),
});

export const planSchema = z.preprocess((value) => {
  if (
    value &&
    typeof value === "object" &&
    !("savingsAmount" in value) &&
    "savingsGoal" in value
  ) {
    return { ...value, savingsAmount: value.savingsGoal };
  }
  return value;
}, planInputSchema).refine(
  ({ savingsAmount, savingsPercentage, savingsIncomePercentage }) =>
    [savingsAmount, savingsPercentage, savingsIncomePercentage].filter((value) => value !== null).length <= 1,
  { message: "Choose one savings method." },
).transform((plan) => {
  const reserved = plan.savingsIncomePercentage !== null ? plan.incomeSavingsReserved : plan.savingsPercentage === null
    ? plan.savingsAmount ?? 0
    : Math.max(0, plan.balance) * plan.savingsPercentage / 100;

  return {
    ...plan,
    savingsReserved: Math.round((reserved + Number.EPSILON) * 100) / 100,
  };
});
