import z = require("zod");

export const billSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1),
  amount: z.number().nonnegative(),
  dueDate: z.iso.date().refine((date) => date >= "1000-01-01"),
  recurrence: z.object({
    frequency: z.enum(["weekly", "biweekly", "monthly", "yearly"]),
    name: z.string().trim().min(1),
    amount: z.number().nonnegative(),
    anchorDate: z.iso.date().refine((date) => date >= "1000-01-01"),
    nextDueDate: z.iso.date().refine((date) => date >= "1000-01-01"),
  }).optional(),
}).refine((bill) => !bill.recurrence || (bill.recurrence.nextDueDate > bill.dueDate &&
  bill.recurrence.anchorDate <= bill.recurrence.nextDueDate),
{ message: "The next repeat must be after the current bill and on or after its schedule anchor." });
