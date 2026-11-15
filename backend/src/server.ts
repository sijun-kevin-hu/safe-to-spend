import { requireAuth } from "./middleware/require-auth";
import { planSchema } from "./schemas/plan";
import { profileSchema, type Profile } from "./schemas/profile";
import type { Plan } from "./types/plan";
import { readIncomeSavings } from "./lib/income-savings";

import express = require("express");

const app: express.Express = express();
app.use(express.json({ limit: "1mb" }));
const port = Number(process.env.PORT) || 3000;

type PlanResponse = (Plan & { supportsIncome: true; supportsRecurringBills: true; supportsIncomeSavings: boolean; supportsSavingsTasks: boolean }) | { error: string };
type AuthResponse = { id: string; email: string | null } | { error: string };
type ProfileResponse = Profile | null | { error: string };

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get<{}, AuthResponse>("/auth/me", requireAuth, (_req, res) => {
  const user = res.locals.user;

  res.json({
    id: user.id,
    email: user.email ?? null,
  });
});

app.get<{}, ProfileResponse>("/profile", requireAuth, async (_req, res) => {
  const user = res.locals.user;
  const userSupabase = res.locals.supabase;
  const { data, error } = await userSupabase
    .from("profiles")
    .select("display_name, date_of_birth")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Unable to load profile from Supabase:", error);
    res.status(500).json({ error: "Unable to load profile." });
    return;
  }

  if (!data?.display_name || !data.date_of_birth) {
    res.json(null);
    return;
  }

  const result = profileSchema.safeParse({
    displayName: data.display_name,
    dateOfBirth: data.date_of_birth,
  });
  if (!result.success) {
    console.error("Stored profile failed validation:", result.error);
    res.status(500).json({ error: "Stored profile is invalid." });
    return;
  }

  res.json(result.data);
});

app.put<{}, ProfileResponse, unknown>("/profile", requireAuth, async (req, res) => {
  const result = profileSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "Enter a valid full name and date of birth." });
    return;
  }

  const user = res.locals.user;
  const userSupabase = res.locals.supabase;
  const { error } = await userSupabase.from("profiles").upsert(
    {
      id: user.id,
      display_name: result.data.displayName,
      date_of_birth: result.data.dateOfBirth,
    },
    { onConflict: "id" },
  );

  if (error) {
    console.error("Unable to save profile to Supabase:", error);
    res.status(500).json({ error: "Unable to save profile." });
    return;
  }

  res.json(result.data);
});

app.get<{}, PlanResponse>("/plan", requireAuth, async (_req, res) => {
  const user = res.locals.user;
  const userSupabase = res.locals.supabase;
  const [planResult, profileResult, incomeSavings] = await Promise.all([
    userSupabase
      .from("plans")
      .select("balance, savings_goal, savings_amount, savings_percentage, bill_items, balance_updated_at, purchases")
      .eq("user_id", user.id)
      .maybeSingle(),
    userSupabase
      .from("profiles")
      .select("tracking_preference")
      .eq("id", user.id)
      .maybeSingle(),
    readIncomeSavings(userSupabase, user.id),
  ]);

  if (planResult.error || profileResult.error || incomeSavings.error) {
    console.error("Unable to load plan from Supabase:", {
      planError: planResult.error,
      profileError: profileResult.error,
      incomeSavingsError: incomeSavings.error,
    });
    res.status(500).json({ error: "Unable to load plan." });
    return;
  }

  const trackingPreference = profileResult.data?.tracking_preference ?? null;

  if (planResult.data === null) {
    res.json({
      balance: 0,
      supportsIncome: true,
      supportsRecurringBills: true,
      supportsIncomeSavings: incomeSavings.supported,
      supportsSavingsTasks: incomeSavings.supported,
      trackingPreference,
      balanceUpdatedAt: null,
      purchases: [],
      savingsAmount: null,
      savingsPercentage: null,
      savingsIncomePercentage: null,
      savingsIncomeAmount: null,
      incomeSavingsReserved: 0,
      savingsReserved: 0,
      billItems: [],
    });
    return;
  }

  const data = planResult.data;
  const storedAmount = data.savings_amount === null
    ? Number(data.savings_goal) || null
    : Number(data.savings_amount);
  const result = planSchema.safeParse({
    balance: Number(data.balance),
    trackingPreference,
    balanceUpdatedAt: data.balance_updated_at ? new Date(data.balance_updated_at).toISOString() : null,
    purchases: data.purchases,
    savingsAmount: (incomeSavings.percentage !== null || incomeSavings.amount !== null) ? null : data.savings_percentage === null ? storedAmount : null,
    savingsPercentage: data.savings_percentage === null ? null : Number(data.savings_percentage),
    savingsIncomePercentage: incomeSavings.percentage,
    savingsIncomeAmount: incomeSavings.amount,
    incomeSavingsReserved: incomeSavings.reserved,
    billItems: data.bill_items,
  });

  if (!result.success) {
    console.error("Stored plan failed validation:", result.error);
    res.status(500).json({ error: "Stored plan is invalid." });
    return;
  }

  res.json({ ...result.data, supportsIncome: true, supportsRecurringBills: true, supportsIncomeSavings: incomeSavings.supported, supportsSavingsTasks: incomeSavings.supported });
});

app.put<{}, PlanResponse, unknown>("/plan", requireAuth, async (req, res) => {
  if (req.body && typeof req.body === "object" &&
    (("savingsIncomePercentage" in req.body) !== ("incomeSavingsReserved" in req.body))) {
    res.status(400).json({ error: "Include both income-savings fields." }); return;
  }
  if (req.body && typeof req.body === "object" && "savingsIncomeAmount" in req.body &&
    (!("savingsIncomePercentage" in req.body) || !("incomeSavingsReserved" in req.body))) {
    res.status(400).json({ error: "Include the income savings setting and reserve together." }); return;
  }
  const result = planSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "Invalid plan." });
    return;
  }

  const user = res.locals.user;
  const userSupabase = res.locals.supabase;
  const incomeSavings = await readIncomeSavings(userSupabase, user.id);
  if (incomeSavings.error) {
    res.status(500).json({ error: "Unable to verify savings settings." }); return;
  }
  if (incomeSavings.amount !== null && !(req.body && typeof req.body === "object" && "savingsIncomeAmount" in req.body)) {
    res.status(409).json({ error: "Update the app to preserve your savings method." }); return;
  }
  const includesIncomeSavings = Boolean(req.body && typeof req.body === "object" &&
    "savingsIncomePercentage" in req.body && "incomeSavingsReserved" in req.body);
  if (!incomeSavings.supported && (result.data.savingsIncomePercentage !== null || result.data.savingsIncomeAmount !== null || result.data.incomeSavingsReserved !== 0)) {
    res.status(503).json({ error: "Income-based savings is not available yet." }); return;
  }
  if (!includesIncomeSavings && (incomeSavings.percentage !== null || incomeSavings.amount !== null)) {
    res.status(409).json({ error: "Update the app to preserve your income-based savings." }); return;
  }
  const savedPlan = { ...result.data,
    savingsIncomePercentage: includesIncomeSavings ? result.data.savingsIncomePercentage : incomeSavings.percentage,
    incomeSavingsReserved: includesIncomeSavings ? result.data.incomeSavingsReserved : incomeSavings.reserved };
  const includesTrackingPreference = Boolean(
    req.body &&
    typeof req.body === "object" &&
    "trackingPreference" in req.body,
  );
  const { error: planError } = await userSupabase.from("plans").upsert(
    {
      user_id: user.id,
      balance: result.data.balance,
      // Keep the legacy derived column populated during the API rollout.
      savings_goal: result.data.savingsReserved,
      savings_amount: result.data.savingsAmount,
      savings_percentage: result.data.savingsPercentage,
      ...(incomeSavings.supported && includesIncomeSavings ? {
        savings_income_amount: savedPlan.savingsIncomeAmount,
        savings_income_percentage: savedPlan.savingsIncomePercentage,
        income_savings_reserved: savedPlan.incomeSavingsReserved,
      } : {}),
      bill_items: result.data.billItems,
      // Older clients omit these fields; do not erase tracking history.
      ...(includesTrackingPreference ? {
        balance_updated_at: result.data.balanceUpdatedAt,
        purchases: result.data.purchases,
      } : {}),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (planError) {
    console.error("Unable to save plan to Supabase:", planError);
    res.status(500).json({ error: "Unable to save plan." });
    return;
  }

  if (includesTrackingPreference) {
    const { error: profileError } = await userSupabase.from("profiles").upsert(
      {
        id: user.id,
        tracking_preference: result.data.trackingPreference,
      },
      { onConflict: "id" },
    );

    if (profileError) {
      console.error("Unable to save profile to Supabase:", profileError);
      res.status(500).json({ error: "Unable to save tracking preference." });
      return;
    }
  }

  res.json({ ...savedPlan, supportsIncome: true, supportsRecurringBills: true, supportsIncomeSavings: incomeSavings.supported, supportsSavingsTasks: incomeSavings.supported });
});

app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});
