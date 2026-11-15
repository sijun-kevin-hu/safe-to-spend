import type { PlanInput, ActivityEntry, StoredPlan } from "./plan";
import { isValidBill, sameBill } from "./bills";
import { supabase } from "./supabase";

export async function requestPlan(
  userId: string,
  plan?: PlanInput,
): Promise<StoredPlan> {
  if (!supabase) throw new Error("Authentication is not configured.");
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session || data.session.user.id !== userId)
    throw new Error("Please sign in again.");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL || "https://safe-to-spend-chi.vercel.app"}/plan`,
      {
        method: plan ? "PUT" : "GET",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${data.session.access_token}`,
          "Content-Type": "application/json",
        },
        ...(plan ? { body: JSON.stringify(plan) } : {}),
      },
    );
    if (!response.ok)
      throw new Error(
        response.status === 401
          ? "Your session expired. Please sign in again."
          : "Unable to connect to your plan. Please try again.",
      );
    const value = await response.json();
    if (
      !value ||
      !Number.isFinite(value.balance) ||
      !Array.isArray(value.billItems) ||
      !value.billItems.every(isValidBill)
    )
      throw new Error("The server returned an invalid plan.");
    const legacyResponse = !("savingsAmount" in value) && !("savingsReserved" in value);
    const savingsAmount = legacyResponse ? value.savingsGoal : value.savingsAmount ?? null;
    const savingsPercentage = value.savingsPercentage ?? null;
    const savingsReserved = legacyResponse ? value.savingsGoal : value.savingsReserved;
    const validAmount = savingsAmount === null || (Number.isFinite(savingsAmount) && savingsAmount >= 0);
    const validPercentage = savingsPercentage === null || (
      Number.isFinite(savingsPercentage) && savingsPercentage >= 0 && savingsPercentage <= 100
    );
    if (
      !validAmount ||
      !validPercentage ||
      !Number.isFinite(savingsReserved) ||
      savingsReserved < 0 ||
      (savingsAmount !== null && savingsPercentage !== null)
    ) {
      throw new Error("The server returned an invalid savings setting.");
    }
    if (plan && (
      value.billItems.length !== plan.billItems.length ||
      value.billItems.some((bill: unknown, index: number) => !isValidBill(bill) || !sameBill(bill, plan.billItems[index]))
    )) throw new Error("The server did not save your bills or repeat settings. Please update the API.");
    if (plan && (
      legacyResponse ||
      savingsAmount !== plan.savingsAmount ||
      savingsPercentage !== plan.savingsPercentage
    )) {
      throw new Error("The server did not save your savings setting. Please update the API.");
    }
    const trackingPreference = value.trackingPreference ?? null;
    const balanceUpdatedAt = value.balanceUpdatedAt ?? null;
    const purchases = value.purchases ?? [];
    if (
      ![null, "purchases", "balance"].includes(trackingPreference) ||
      (balanceUpdatedAt !== null && (typeof balanceUpdatedAt !== "string" || !Number.isFinite(Date.parse(balanceUpdatedAt)))) ||
      !Array.isArray(purchases) || !purchases.every((item: ActivityEntry) =>
        item && typeof item.id === "string" && Number.isFinite(item.amount) &&
        (item.kind === "balance_check_in" || item.amount >= 0.01) &&
        (item.kind === undefined || ["purchase", "income", "balance_check_in"].includes(item.kind)) &&
        validBalanceDetails(item) &&
        typeof item.createdAt === "string" && Number.isFinite(Date.parse(item.createdAt)) &&
        (item.note === undefined || (typeof item.note === "string" && item.note.length <= 120))) ||
      new Set(purchases.map((item: ActivityEntry) => item.id)).size !== purchases.length
    ) throw new Error("The server returned invalid tracking data.");
    if (plan && (
      !("trackingPreference" in value) ||
      trackingPreference !== plan.trackingPreference ||
      balanceUpdatedAt !== plan.balanceUpdatedAt ||
      value.balance !== plan.balance ||
      (purchases.length !== plan.purchases.length || purchases.some((item: ActivityEntry, index: number) => {
        const sent = plan.purchases[index];
        return item.id !== sent.id || item.amount !== sent.amount || item.createdAt !== sent.createdAt ||
          (item.note ?? "") !== (sent.note ?? "") || (item.kind ?? "purchase") !== (sent.kind ?? "purchase") ||
          item.balanceBefore !== sent.balanceBefore || item.balanceAfter !== sent.balanceAfter;
      }))
    )) throw new Error("The server did not save your balance or transactions. Please update the API.");
    return {
      balance: value.balance,
      trackingPreference,
      balanceUpdatedAt,
      purchases,
      savingsAmount,
      savingsPercentage,
      savingsReserved,
      supportsIncome: value.supportsIncome === true,
      supportsRecurringBills: value.supportsRecurringBills === true,
      billItems: value.billItems,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function validBalanceDetails(item: ActivityEntry) {
  const checkIn = item.kind === "balance_check_in";
  if (item.balanceBefore === undefined && item.balanceAfter === undefined) return !checkIn;
  if (!Number.isFinite(item.balanceAfter)) return false;
  if (item.balanceBefore === null) return checkIn && item.amount === 0;
  if (!Number.isFinite(item.balanceBefore)) return false;
  const change = Math.round((item.balanceAfter! - item.balanceBefore!) * 100) / 100;
  return change === (checkIn || item.kind === "income" ? item.amount : -item.amount);
}
