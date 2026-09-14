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

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get<{}, Plan>("/plan", (_req, res) => {
  res.json(plan);
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
