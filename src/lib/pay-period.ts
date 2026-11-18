import { isBillDate, nextBillDate } from "./bills";
import type { Bill } from "../types/bill";

export const payFrequencies = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every 2 weeks" },
  { value: "semimonthly", label: "Twice a month (1st & 15th)" },
  { value: "monthly", label: "Monthly" },
  { value: "bimonthly", label: "Every 2 months" },
] as const;
export type PayPeriod = { frequency: typeof payFrequencies[number]["value"]; nextPayday: string };
export function isPayPeriod(value: unknown): value is PayPeriod {
  if (!value || typeof value !== "object") return false;
  const period = value as PayPeriod;
  return payFrequencies.some(f => f.value === period.frequency) && isBillDate(period.nextPayday);
}

// The payday itself starts a fresh period. Never assume that income has arrived.
export function periodEnd(period: PayPeriod, today: string): string {
  if (!isPayPeriod(period) || !isBillDate(today)) throw new Error("Choose a valid pay period.");
  if (period.frequency === "semimonthly") {
    const [y, m, d] = today.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1 + (d >= 15 ? 1 : 0), d < 15 ? 15 : 1)).toISOString().slice(0, 10);
  }
  const [y, m, d] = period.nextPayday.split("-").map(Number);
  if (period.nextPayday > today) return period.nextPayday;
  if (period.frequency === "weekly" || period.frequency === "biweekly") {
    const days = period.frequency === "weekly" ? 7 : 14;
    const start = Date.UTC(y, m - 1, d);
    const now = Date.parse(`${today}T00:00:00Z`);
    return new Date(start + (Math.floor((now - start) / (days * 86400000)) + 1) * days * 86400000).toISOString().slice(0, 10);
  }
  const [ty, tm] = today.split("-").map(Number);
  const months = period.frequency === "bimonthly" ? 2 : 1;
  let step = Math.max(0, Math.floor(((ty - y) * 12 + tm - m) / months));
  while (true) {
    const first = new Date(Date.UTC(y, m - 1 + step * months, 1));
    const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
    const date = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), Math.min(d, last))).toISOString().slice(0, 10);
    if (date > today) return date;
    step++;
  }
}

// Preserve the outstanding overdue item, then project future template payments.
// Projection never adds bills to storage or changes their paid status.
export function billsReserved(bills: Bill[], period: PayPeriod | null, today: string): number {
  if (!period) return Math.round(bills.reduce((sum, b) => sum + b.amount, 0) * 100) / 100;
  const end = periodEnd(period, today);
  let cents = 0;
  for (const bill of bills) {
    if (bill.dueDate < end) cents += Math.round(bill.amount * 100);
    if (!bill.recurrence) continue;
    const repeat = bill.recurrence;
    let date = repeat.nextDueDate;
    while (date < end) {
      if (date >= today) cents += Math.round(repeat.amount * 100);
      date = nextBillDate(date, repeat.frequency, repeat.anchorDate);
    }
  }
  return cents / 100;
}
