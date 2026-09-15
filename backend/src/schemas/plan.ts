import z = require("zod");
import { billSchema } from "./bill";

const planInputSchema = z.object({
  balance: z.number(),
  trackingPreference: z.enum(["purchases", "balance"]).nullable().default(null),
  balanceUpdatedAt: z.iso.datetime().nullable().default(null),
  purchases: z.array(z.object({
    id: z.string().min(1).max(100),
    amount: z.number().min(0.01),
    createdAt: z.iso.datetime(),
    note: z.string().trim().max(120).optional(),
  })).refine((items) => new Set(items.map((item) => item.id)).size === items.length,
    { message: "Purchase IDs must be unique." }).default([]),
  savingsAmount: z.number().nonnegative().nullable().default(null),
  savingsPercentage: z.number().min(0).max(100).nullable().default(null),
  billItems: z.array(billSchema),
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
  ({ savingsAmount, savingsPercentage }) =>
    savingsAmount === null || savingsPercentage === null,
  { message: "Choose either a savings amount or percentage, not both." },
).transform((plan) => {
  const reserved = plan.savingsPercentage === null
    ? plan.savingsAmount ?? 0
    : Math.max(0, plan.balance) * plan.savingsPercentage / 100;

  return {
    ...plan,
    savingsReserved: Math.round((reserved + Number.EPSILON) * 100) / 100,
  };
});
