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
    kind: z.enum(["purchase", "income", "balance_check_in", "savings_transfer"]).optional(),
    balanceBefore: z.number().nullable().optional(),
    balanceAfter: z.number().optional(),
    savingsSavedAt: z.iso.datetime().optional(),
    savingsSourceId: z.string().min(1).max(100).optional(),
    savingsAllocated: z.number().nonnegative().optional(),
  }).refine((item) => {
    if (item.savingsAllocated !== undefined && (item.kind !== "income" || item.savingsAllocated > item.amount)) return false;
    if (item.savingsSavedAt !== undefined && (item.kind !== "income" || !(item.savingsAllocated! > 0))) return false;
    if ((item.kind === "savings_transfer") !== (item.savingsSourceId !== undefined)) return false;
    if (item.kind === "savings_transfer" && (item.balanceBefore == null || item.balanceAfter === undefined)) return false;
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
  savingsIncomeAmount: z.number().nonnegative().nullable().default(null),
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
  ({ savingsAmount, savingsPercentage, savingsIncomePercentage, savingsIncomeAmount }) =>
    [savingsAmount, savingsPercentage, savingsIncomePercentage, savingsIncomeAmount].filter((value) => value !== null).length <= 1,
  { message: "Choose one savings method." },
).refine((plan) => plan.purchases.every(e => {
  if (e.kind === "income" && e.savingsSavedAt) return plan.purchases.some(t => t.kind === "savings_transfer" && t.savingsSourceId === e.id && t.amount === e.savingsAllocated && t.createdAt === e.savingsSavedAt);
  if (e.kind === "savings_transfer" && e.savingsSourceId !== "carryover") return plan.purchases.some(i => i.kind === "income" && i.id === e.savingsSourceId && i.savingsSavedAt === e.createdAt && i.savingsAllocated === e.amount);
  return true;
}) && new Set(plan.purchases.filter(e => e.kind === "savings_transfer" && e.savingsSourceId !== "carryover").map(e => e.savingsSourceId)).size === plan.purchases.filter(e => e.kind === "savings_transfer" && e.savingsSourceId !== "carryover").length,
{ message: "Savings transfers must match completed income allocations." }).transform((plan) => {
  const reserved = (plan.savingsIncomePercentage !== null || plan.savingsIncomeAmount !== null) ? plan.incomeSavingsReserved : plan.savingsPercentage === null
    ? plan.savingsAmount ?? 0
    : Math.max(0, plan.balance) * plan.savingsPercentage / 100;

  return {
    ...plan,
    savingsReserved: Math.round((reserved + Number.EPSILON) * 100) / 100,
  };
});
