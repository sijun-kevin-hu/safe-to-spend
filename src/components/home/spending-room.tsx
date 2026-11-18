import { palette, ui } from "@/constants/design";
import { usePlan } from "@/context/plan-context";
import { formatBillDate, formatCurrency } from "@/lib/format";
import { StyleSheet, Text, View } from "react-native";

export function SpendingRoom() {
  const { balance, balanceUpdatedAt, billItems, savingsReserved, validationError } = usePlan();
  const { billsReserved: billsTotal, periodEnd: endDate } = usePlan();
  const available = balanceUpdatedAt && !validationError
    ? Number(balance) - billsTotal - savingsReserved : null;
  const overBudget = available !== null && available < 0;
  let message = "Update your current balance to get started.";
  if (validationError) message = "Check your savings setting in Plan to see your spending room.";
  else if (available !== null) message = overBudget
    ? "Your listed bills and savings exceed your current balance."
    : billItems.length > 0 && savingsReserved > 0
      ? "After your listed bills and savings are set aside."
      : "Based on what you entered. Add bills and savings in Plan for a fuller picture.";

  return <View style={[styles.card, overBudget && styles.warning]} accessibilityLiveRegion="polite">
    <Text accessibilityRole="header" style={styles.label}>Safe to spend</Text>
    <Text style={[styles.amount, overBudget && styles.negative]}>
      {available === null ? "—" : formatCurrency(available)}
    </Text>
    {endDate && <Text style={ui.body}>Until {formatBillDate(endDate)} · next payday</Text>}
    <Text style={ui.body}>{message}</Text>
  </View>;
}

const styles = StyleSheet.create({
  card: { padding: 24, borderRadius: 20, backgroundColor: palette.soft, gap: 8 },
  warning: { backgroundColor: palette.dangerSoft },
  label: { color: palette.text, fontSize: 16, fontWeight: "600" },
  amount: { color: palette.text, fontSize: 48, fontWeight: "700", fontVariant: ["tabular-nums"], flexShrink: 1 },
  negative: { color: palette.danger },
});
