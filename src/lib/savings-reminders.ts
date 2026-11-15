// Web has no native local notification scheduler.
export function useSavingsReminders(_userId: string, _pending: number, _saved: boolean) {
  return { available: false, enabled: false, busy: false, error: "", toggle: async () => {} };
}
