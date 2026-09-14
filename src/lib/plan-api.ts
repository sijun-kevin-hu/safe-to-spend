import type { Bill } from "@/types/bill";
import { supabase } from "./supabase";

export type StoredPlan = {
  balance: number;
  savingsGoal: number;
  billItems: Bill[];
};
export async function requestPlan(
  userId: string,
  plan?: StoredPlan,
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
      !Number.isFinite(value.savingsGoal) ||
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
    return value;
  } finally {
    clearTimeout(timeout);
  }
}
