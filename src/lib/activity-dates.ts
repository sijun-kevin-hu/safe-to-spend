import type { ActivityEntry } from "./plan";

export const datePresets = [
  ["all", "All time"], ["today", "Today"], ["week", "Last 7 days"],
  ["month", "This month"], ["lastMonth", "Last month"], ["custom", "Custom range"],
] as const;
export type DatePreset = typeof datePresets[number][0];

export function filterActivity(entries: ActivityEntry[], preset: DatePreset, start: Date | null, end: Date | null, now = new Date()) {
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let from: Date | null = null;
  let until: Date | null = null;
  if (preset === "today" || preset === "week") {
    from = new Date(day); if (preset === "week") from.setDate(from.getDate() - 6);
    until = new Date(day); until.setDate(until.getDate() + 1);
  } else if (preset === "month") {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
    until = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  } else if (preset === "lastMonth") {
    from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    until = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (preset === "custom") {
    if (!start || !end || start > end) return [];
    from = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    until = new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1);
  }
  return entries.filter(entry => {
    const timestamp = new Date(entry.createdAt);
    return (!from || timestamp >= from) && (!until || timestamp < until);
  }).sort((a,b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}
