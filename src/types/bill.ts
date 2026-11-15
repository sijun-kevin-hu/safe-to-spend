export type BillFrequency = "weekly" | "biweekly" | "monthly" | "yearly";
export type BillRecurrence = {
  frequency: BillFrequency;
  name: string;
  amount: number;
  anchorDate: string;
  nextDueDate: string;
};

export type Bill = {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  recurrence?: BillRecurrence;
};
