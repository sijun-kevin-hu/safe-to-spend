import { z } from "zod";

const dateOnly = /^\d{4}-\d{2}-\d{2}$/;

export const profileSchema = z.object({
  displayName: z.string().trim().min(2).max(100),
  dateOfBirth: z.string().regex(dateOnly).refine((value) => {
    const year = Number(value.slice(0, 4));
    const month = Number(value.slice(5, 7));
    const day = Number(value.slice(8, 10));
    const date = new Date(Date.UTC(year, month - 1, day));
    const today = new Date();
    const todayOnly = Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate(),
    );
    return date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day &&
      date.getTime() <= todayOnly;
  }),
});

export type Profile = z.infer<typeof profileSchema>;
