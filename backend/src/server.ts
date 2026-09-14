import { requireAuth } from "./middleware/require-auth";
import { planSchema } from "./schemas/plan";
import type { Plan } from "./types/plan";

import express = require("express");

const app: express.Express = express();
app.use(express.json());
const port = 3000;

let plan: Plan = {
  balance: 0,
  savingsGoal: 0,
  billItems: [],
};

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
    .select("balance, savings_goal, bill_items")
    .maybeSingle();

  if (error) {
    console.error("Unable to load plan from Supabase:", error);
    res.status(500).json({ error: "Unable to load plan." });
    return;
  }

  if (data === null) {
    res.json({
      balance: 0,
      savingsGoal: 0,
      billItems: [],
    });
    return;
  }

  const result = planSchema.safeParse({
    balance: Number(data.balance),
    savingsGoal: Number(data.savings_goal),
    billItems: data.bill_items,
  });

  if (!result.success) {
    console.error("Stored plan failed validation:", result.error);
    res.status(500).json({ error: "Stored plan is invalid." });
    return;
  }

  res.json(result.data);
});

app.put<{}, PlanResponse, unknown>("/plan", (req, res) => {
  const result = planSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "Invalid plan." });
    return;
  }
  plan = result.data;
  res.json(plan);
});

app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});
