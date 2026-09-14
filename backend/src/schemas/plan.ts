import z = require("zod");
import { billSchema } from "./bill";

export const planSchema = z.object({
  balance: z.number(),
  savingsGoal: z.number().nonnegative(),
  billItems: z.array(billSchema),
});
