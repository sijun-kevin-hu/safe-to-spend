import z = require("zod");

export const billSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  amount: z.number().nonnegative(),
  dueDate: z.string().min(1),
});
