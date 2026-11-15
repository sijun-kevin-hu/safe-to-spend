export interface Bill {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  recurrence?: {
    frequency: "weekly" | "biweekly" | "monthly" | "yearly";
    name: string;
    amount: number;
    anchorDate: string;
    nextDueDate: string;
  } | undefined;
}
