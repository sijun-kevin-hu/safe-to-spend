import type { PlanInput, Purchase, StoredPlan } from "./plan";
import type { Bill } from "@/types/bill";
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
      !value.billItems.every(
        (bill: Bill) =>
          bill &&
          typeof bill.id === "string" &&
          typeof bill.name === "string" &&
          Number.isFinite(bill.amount) &&
          typeof bill.dueDate === "string",
      )
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
      !Array.isArray(purchases) || !purchases.every((item: Purchase) =>
        item && typeof item.id === "string" && Number.isFinite(item.amount) && item.amount >= 0.01 &&
        typeof item.createdAt === "string" && Number.isFinite(Date.parse(item.createdAt)) &&
        (item.note === undefined || (typeof item.note === "string" && item.note.length <= 120))) ||
      new Set(purchases.map((item: Purchase) => item.id)).size !== purchases.length
    ) throw new Error("The server returned invalid tracking data.");
    if (plan && (
      !("trackingPreference" in value) ||
      trackingPreference !== plan.trackingPreference ||
      balanceUpdatedAt !== plan.balanceUpdatedAt ||
      value.balance !== plan.balance ||
      (purchases.length !== plan.purchases.length || purchases.some((item: Purchase, index: number) => {
        const sent = plan.purchases[index];
        return item.id !== sent.id || item.amount !== sent.amount || item.createdAt !== sent.createdAt ||
          (item.note ?? "") !== (sent.note ?? "");
      }))
    )) throw new Error("The server did not save your balance or tracking preference. Please update the API.");
    return {
      balance: value.balance,
      trackingPreference,
      balanceUpdatedAt,
      purchases,
      savingsAmount,
      savingsPercentage,
      savingsReserved,
      billItems: value.billItems,
    };
  } finally {
    clearTimeout(timeout);
  }
}
