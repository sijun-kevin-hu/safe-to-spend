import { requireAuth } from "./middleware/require-auth";
import { planSchema } from "./schemas/plan";
import type { Plan } from "./types/plan";

import express = require("express");

const app: express.Express = express();
app.use(express.json());
const port = Number(process.env.PORT) || 3000;

type PlanResponse = Plan | { error: string };
type AuthResponse = { id: string; email: string | null } | { error: string };

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

app.get<{}, PlanResponse>("/plan", requireAuth, async (_req, res) => {
  const userSupabase = res.locals.supabase;
  const { data, error } = await userSupabase
    .from("plans")
    .select("balance, savings_goal, savings_amount, savings_percentage, bill_items")
    .maybeSingle();

  if (error) {
    console.error("Unable to load plan from Supabase:", error);
    res.status(500).json({ error: "Unable to load plan." });
    return;
  }

  if (data === null) {
    res.json({
      balance: 0,
      savingsAmount: null,
      savingsPercentage: null,
      savingsReserved: 0,
      billItems: [],
    });
    return;
  }

  const storedAmount = data.savings_amount === null
    ? Number(data.savings_goal) || null
    : Number(data.savings_amount);
  const result = planSchema.safeParse({
    balance: Number(data.balance),
    savingsAmount: data.savings_percentage === null ? storedAmount : null,
    savingsPercentage: data.savings_percentage === null ? null : Number(data.savings_percentage),
    billItems: data.bill_items,
  });

  if (!result.success) {
    console.error("Stored plan failed validation:", result.error);
    res.status(500).json({ error: "Stored plan is invalid." });
    return;
  }

  res.json(result.data);
});

app.put<{}, PlanResponse, unknown>("/plan", requireAuth, async (req, res) => {
  const result = planSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "Invalid plan." });
    return;
  }

  const user = res.locals.user;
  const userSupabase = res.locals.supabase;
  const { error } = await userSupabase.from("plans").upsert(
    {
      user_id: user.id,
      balance: result.data.balance,
      // Keep the legacy derived column populated during the API rollout.
      savings_goal: result.data.savingsReserved,
      savings_amount: result.data.savingsAmount,
      savings_percentage: result.data.savingsPercentage,
      bill_items: result.data.billItems,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    console.error("Unable to save plan to Supabase:", error);
    res.status(500).json({ error: "Unable to save plan." });
    return;
  }

  res.json(result.data);
});

app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});
