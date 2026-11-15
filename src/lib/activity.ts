import type { ActivityEntry, TrackingState } from "./plan";

const cents = (value: number) => Math.round(value * 100) / 100;
const change = (entry: ActivityEntry) => entry.kind === "income" ? entry.amount : -entry.amount;
const pending = (entries: ActivityEntry[]) => entries.reduce((sum, entry) =>
  sum + (entry.kind === "income" && !entry.savingsSavedAt ? entry.savingsAllocated ?? 0 : 0), 0);

export type ActivityEdit = { amount: number; note: string; savingsAllocated?: number };

/** Correct the ledger in its saved order. Check-ins remain absolute balance anchors. */
export function reviseActivity(state: TrackingState, id: string, edit: ActivityEdit | null): TrackingState {
  const original = state.purchases.find(entry => entry.id === id);
  if (!original) throw new Error("This activity is no longer available.");
  const checkIn = original.kind === "balance_check_in";
  if (edit && (!Number.isFinite(edit.amount) || Math.abs(edit.amount) > 1e12 || (!checkIn && edit.amount < 0.01))) {
    throw new Error(checkIn ? "Enter a valid balance." : "Enter an amount of at least $0.01.");
  }
  if (edit && edit.note.trim().length > 120) throw new Error("Keep the description under 120 characters.");
  if (edit?.savingsAllocated !== undefined && (!Number.isFinite(edit.savingsAllocated) || edit.savingsAllocated < 0 || edit.savingsAllocated > edit.amount)) {
    throw new Error("Savings must be between zero and the income amount.");
  }
  let entries = state.purchases.map(entry => ({ ...entry }));
  const target = entries.find(entry => entry.id === id)!;
  if (edit) {
    target.note = edit.note.trim();
    if (checkIn) target.balanceAfter = cents(edit.amount);
    else target.amount = cents(edit.amount);
    if (target.kind === "income" && target.savingsAllocated !== undefined) {
      target.savingsAllocated = cents(edit.savingsAllocated ?? Math.min(target.savingsAllocated, target.amount));
    }
  } else entries = entries.filter(entry => entry.id !== id);

  // A transfer and its income receipt describe the same savings movement.
  if (original.kind === "savings_transfer" && original.savingsSourceId !== "carryover") {
    const source = entries.find(entry => entry.id === original.savingsSourceId);
    if (source) {
      if (edit) {
        if (target.amount > source.amount) throw new Error("Savings cannot exceed the linked income amount.");
        source.savingsAllocated = target.amount;
      } else delete source.savingsSavedAt;
    }
  }
  if (original.kind === "income") {
    if (!edit || !(target.savingsAllocated! > 0)) {
      entries = entries.filter(entry => entry.savingsSourceId !== id);
      delete target.savingsSavedAt;
    } else {
      for (const entry of entries) if (entry.kind === "savings_transfer" && entry.savingsSourceId === id) entry.amount = target.savingsAllocated!;
    }
  }

  let baseline = state.balance;
  for (const entry of state.purchases) {
    if (entry.balanceBefore !== undefined) baseline = entry.balanceBefore ?? 0;
    else baseline = cents(baseline - change(entry));
  }
  let balance = baseline;
  let known = state.purchases.at(-1)?.balanceBefore !== null;
  for (const entry of [...entries].reverse()) {
    const before = balance;
    if (entry.kind === "balance_check_in") {
      balance = entry.balanceAfter!;
      entry.balanceBefore = known ? before : null;
      entry.amount = known ? cents(balance - before) : 0;
      entry.balanceAfter = balance;
    } else {
      balance = cents(balance + change(entry));
      // Do not invent balance snapshots for legacy entries.
      if (entry.balanceBefore !== undefined) { entry.balanceBefore = before; entry.balanceAfter = balance; }
    }
    known = true;
  }
  const carryoverRefund = original.kind === "savings_transfer" && original.savingsSourceId === "carryover"
    ? original.amount - (edit ? target.amount : 0) : 0;
  const reserve = cents((state.incomeSavingsReserved ?? 0) + pending(entries) - pending(state.purchases) + carryoverRefund);
  if (reserve < 0) throw new Error("This change exceeds your savings reserve. Adjust the reserved amount in Plan first.");
  const lastCheckIn = entries.find(entry => entry.kind === "balance_check_in");
  return { ...state, balance, purchases: entries, incomeSavingsReserved: reserve,
    activityRevision: (state.activityRevision ?? 0) + 1,
    balanceUpdatedAt: lastCheckIn?.createdAt ?? (state.purchases.some(entry => entry.kind === "balance_check_in") ? null : state.balanceUpdatedAt) };
}
