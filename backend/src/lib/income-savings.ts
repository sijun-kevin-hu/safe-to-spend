import type { SupabaseClient } from "@supabase/supabase-js";

// Allow legacy savings to keep working while the additive migration rolls out.
export async function readIncomeSavings(client: SupabaseClient, userId: string) {
  const { data, error } = await client.from("plans")
    .select("savings_income_percentage, income_savings_reserved, savings_income_amount").eq("user_id", userId).maybeSingle();
  const missing = error && ["42703", "PGRST204"].includes(error.code) &&
    /savings_income_percentage|income_savings_reserved|savings_income_amount/.test(error.message);
  return {
    supported: !missing && !error,
    percentage: data?.savings_income_percentage == null ? null : Number(data.savings_income_percentage),
    amount: data?.savings_income_amount == null ? null : Number(data.savings_income_amount),
    reserved: Number(data?.income_savings_reserved ?? 0),
    error: missing ? null : error,
  };
}
