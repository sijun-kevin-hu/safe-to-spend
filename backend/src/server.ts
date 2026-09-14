import type { Plan } from "./types/plan";

import express = require("express");

const app: express.Express = express();
const port = 3000;

const plan: Plan = {
  balance: 0,
  savingsGoal: 0,
  billItems: [],
};

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/plan", (_req, res: express.Response<Plan>) => {
  res.json(plan);
});

app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});
