import type { Bill, BillFrequency, BillRecurrence } from "@/types/bill";

export type BillRepeat = "never" | BillFrequency;
export const billRepeats: { value: BillRepeat; label: string }[] = [
  { value: "never", label: "Never" }, { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every 2 weeks" }, { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

export function isBillDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return year >= 1000 && date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

// Calendar arithmetic in UTC keeps repeats independent of DST and device timezone.
export function nextBillDate(current: string, frequency: BillFrequency, anchor = current): string {
  if (!isBillDate(current) || !isBillDate(anchor)) throw new Error("Choose a valid due date.");
  const [year, month, day] = current.split("-").map(Number);
  const [, anchorMonth, anchorDay] = anchor.split("-").map(Number);
  let next: Date;
  if (frequency === "weekly" || frequency === "biweekly") {
    next = new Date(Date.UTC(year, month - 1, day + (frequency === "weekly" ? 7 : 14)));
  } else {
    const targetYear = frequency === "yearly" ? year + 1 : month === 12 ? year + 1 : year;
    const targetMonth = frequency === "yearly" ? anchorMonth - 1 : month % 12;
    const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
    next = new Date(Date.UTC(targetYear, targetMonth, Math.min(anchorDay, lastDay)));
  }
  const result = next.toISOString().slice(0, 10);
  if (!isBillDate(result) || result <= current) throw new Error("Choose an earlier due date.");
  return result;
}

export function setBillRepeat(bill: Bill, repeat: BillRepeat): Bill {
  const { recurrence: _old, ...current } = bill;
  if (repeat === "never") return current;
  return { ...current, recurrence: { frequency: repeat, name: bill.name, amount: bill.amount,
    anchorDate: bill.dueDate, nextDueDate: nextBillDate(bill.dueDate, repeat) } };
}

export function markBillPaid(bills: Bill[], id: string, nextId: string): Bill[] {
  const current = bills.find((bill) => bill.id === id);
  if (!current) return bills; // Repeated presses cannot advance the schedule twice.
  if (!current.recurrence) return bills.filter((bill) => bill.id !== id);
  const template = current.recurrence;
  const next: Bill = { id: nextId, name: template.name, amount: template.amount, dueDate: template.nextDueDate,
    recurrence: { ...template, nextDueDate: nextBillDate(template.nextDueDate, template.frequency, template.anchorDate) } };
  return bills.map((bill) => bill.id === id ? next : bill);
}

export function isValidBill(value: unknown): value is Bill {
  if (!value || typeof value !== "object") return false;
  const bill = value as Bill;
  if (typeof bill.id !== "string" || !bill.id || typeof bill.name !== "string" || !bill.name.trim() ||
    !Number.isFinite(bill.amount) || bill.amount < 0 || !isBillDate(bill.dueDate)) return false;
  if (bill.recurrence === undefined) return true;
  const repeat = bill.recurrence as BillRecurrence | null;
  return !!repeat && typeof repeat === "object" &&
    ["weekly", "biweekly", "monthly", "yearly"].includes(repeat.frequency) &&
    typeof repeat.name === "string" && !!repeat.name.trim() && Number.isFinite(repeat.amount) && repeat.amount >= 0 &&
    isBillDate(repeat.anchorDate) && isBillDate(repeat.nextDueDate) &&
    repeat.nextDueDate > bill.dueDate && repeat.anchorDate <= repeat.nextDueDate;
}

export function sameBill(first: Bill, second: Bill): boolean {
  return first.id === second.id && first.name === second.name && first.amount === second.amount && first.dueDate === second.dueDate &&
    (first.recurrence === undefined ? second.recurrence === undefined : !!second.recurrence &&
      first.recurrence.frequency === second.recurrence.frequency && first.recurrence.name === second.recurrence.name &&
      first.recurrence.amount === second.recurrence.amount && first.recurrence.anchorDate === second.recurrence.anchorDate &&
      first.recurrence.nextDueDate === second.recurrence.nextDueDate);
}
