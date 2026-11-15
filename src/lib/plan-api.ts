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
      !value.billItems.every(isValidBill) ||
      new Set(value.billItems.map((bill: { id: string }) => bill.id)).size !== value.billItems.length
    )
      throw new Error("The server returned an invalid plan.");
    const legacyResponse = !("savingsAmount" in value) && !("savingsReserved" in value);
    const savingsAmount = legacyResponse ? value.savingsGoal : value.savingsAmount ?? null;
    const savingsPercentage = value.savingsPercentage ?? null;
    const savingsIncomeAmount = value.savingsIncomeAmount ?? null;
    const savingsIncomePercentage = value.savingsIncomePercentage ?? null;
    const incomeSavingsReserved = value.incomeSavingsReserved ?? 0;
    const savingsReserved = legacyResponse ? value.savingsGoal : value.savingsReserved;
    const validAmount = savingsAmount === null || (Number.isFinite(savingsAmount) && savingsAmount >= 0);
    const validPercentage = savingsPercentage === null || (
      Number.isFinite(savingsPercentage) && savingsPercentage >= 0 && savingsPercentage <= 100
    );
    if (
      (savingsIncomeAmount !== null && (!Number.isFinite(savingsIncomeAmount) || savingsIncomeAmount < 0)) ||
      !validAmount ||
      !validPercentage ||
      (savingsIncomePercentage !== null && (!Number.isFinite(savingsIncomePercentage) || savingsIncomePercentage < 0 || savingsIncomePercentage > 100)) ||
      !Number.isFinite(incomeSavingsReserved) || incomeSavingsReserved < 0 ||
      !Number.isFinite(savingsReserved) ||
      savingsReserved < 0 ||
      [savingsAmount, savingsPercentage, savingsIncomePercentage, savingsIncomeAmount].filter((item) => item !== null).length > 1
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
      || savingsIncomeAmount !== (plan.savingsIncomeAmount ?? null)
      || savingsIncomePercentage !== (plan.savingsIncomePercentage ?? null)
      || incomeSavingsReserved !== (plan.incomeSavingsReserved ?? 0)
    )) {
      throw new Error("The server did not save your savings setting. Please update the API.");
    }
    const activityRevision = value.activityRevision ?? 0;
    if (!Number.isSafeInteger(activityRevision) || activityRevision < 0) throw new Error("Invalid activity revision.");
    if (plan && activityRevision !== (plan.activityRevision ?? 0)) throw new Error("Your activity changes were not saved.");
    const trackingPreference = value.trackingPreference ?? null;
    const balanceUpdatedAt = value.balanceUpdatedAt ?? null;
    const purchases = value.purchases ?? [];
    if (
      ![null, "purchases", "balance"].includes(trackingPreference) ||
      (balanceUpdatedAt !== null && (typeof balanceUpdatedAt !== "string" || !Number.isFinite(Date.parse(balanceUpdatedAt)))) ||
      !Array.isArray(purchases) || !purchases.every((item: ActivityEntry) =>
        item && typeof item.id === "string" && Number.isFinite(item.amount) &&
        (item.kind === "balance_check_in" || item.amount >= 0.01) &&
        (item.kind === undefined || ["purchase", "income", "balance_check_in", "savings_transfer"].includes(item.kind)) &&
        validBalanceDetails(item) &&
        (item.savingsSavedAt === undefined || (item.kind === "income" && typeof item.savingsSavedAt === "string" && Number.isFinite(Date.parse(item.savingsSavedAt)))) &&
        (item.kind !== "savings_transfer" || typeof item.savingsSourceId === "string") &&
        (item.savingsAllocated === undefined || (item.kind === "income" && Number.isFinite(item.savingsAllocated) && item.savingsAllocated >= 0 && item.savingsAllocated <= item.amount)) &&
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
          item.balanceBefore !== sent.balanceBefore || item.balanceAfter !== sent.balanceAfter || item.savingsAllocated !== sent.savingsAllocated || item.savingsSavedAt !== sent.savingsSavedAt || item.savingsSourceId !== sent.savingsSourceId;
      }))
    )) throw new Error("The server did not save your balance or transactions. Please update the API.");
    return {
      activityRevision,
      supportsActivityEditing: value.supportsActivityEditing === true,
      balance: value.balance,
      trackingPreference,
      balanceUpdatedAt,
      purchases,
      savingsAmount,
      savingsPercentage,
      savingsIncomePercentage,
      savingsIncomeAmount,
      incomeSavingsReserved,
      savingsReserved,
      supportsIncome: value.supportsIncome === true,
      supportsRecurringBills: value.supportsRecurringBills === true,
      supportsSavingsTasks: value.supportsSavingsTasks === true,
      supportsIncomeSavings: value.supportsIncomeSavings === true,
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
