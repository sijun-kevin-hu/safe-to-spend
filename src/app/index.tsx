import { SaveStatus } from "@/components/plan/save-status";
import { AppButton } from "@/components/app-button";
import { CurrencyInput } from "@/components/currency-input";
import { Screen } from "@/components/screen";
import { palette, ui } from "@/constants/design";
import { usePlan } from "@/context/plan-context";
import { formatCurrency } from "@/lib/format";
import { useState } from "react";
import { Keyboard, StyleSheet, Text, View } from "react-native";

export default function HomeScreen() {
  const { balance, setBalance, savingsReserved, validationError, billItems } = usePlan();
  const [error, setError] = useState("");
  // Store the inputs used for a calculation so edited plans never show a stale answer.
  const [calculatedInputs, setCalculatedInputs] = useState<string | null>(null);
  const billsTotal = billItems.reduce((total, bill) => total + bill.amount, 0);
  const savings = savingsReserved;
  const inputKey = JSON.stringify([
    balance.trim() ? Number(balance) : null,
    savings,
    billItems,
  ]);
  const safeToSpend = calculatedInputs === inputKey
    ? Number(balance) - billsTotal - savings
    : null;
  const overBudget = safeToSpend !== null && safeToSpend < 0;
  const hasReserves = billItems.length > 0 && savings > 0;

  let resultMessage = "Enter or update your balance, then calculate your spending room.";
  if (safeToSpend !== null) {
    if (overBudget) {
      resultMessage = "Your bills and savings exceed your current balance.";
    } else if (hasReserves) {
      resultMessage = "Your listed bills and savings are set aside.";
    } else {
      resultMessage = "Based on what you entered. Add bills and savings in Plan for a fuller picture.";
    }
  }

  function calculate() {
    Keyboard.dismiss();
    if (!balance.trim()) return setError("Enter your current balance.");
    if (validationError || ![Number(balance), savings].every(Number.isFinite) || savings < 0) {
      return setError("Enter a valid balance and nonnegative savings amount.");
    }
    setError("");
    setCalculatedInputs(inputKey);
  }

  return (
    <Screen>
      <Text accessibilityRole="header" style={ui.title}>Safe to Spend</Text>
      <View style={[styles.result, overBudget && styles.warning]} accessibilityLiveRegion="polite">
        <Text style={ui.label}>{overBudget ? "Amount over your balance" : "Safe to spend"}</Text>
        <Text style={styles.amount}>{safeToSpend === null ? "—" : formatCurrency(Math.abs(safeToSpend))}</Text>
        <Text style={ui.body}>{resultMessage}</Text>
      </View>
      <View style={ui.card}>
        <Text accessibilityRole="header" style={ui.sectionTitle}>Your breakdown</Text>
        <View style={ui.row}>
          <Text style={ui.body}>Bills set aside</Text>
          <Text style={ui.money}>{formatCurrency(billsTotal)}</Text>
        </View>
        <View style={ui.row}>
          <Text style={ui.body}>Savings set aside</Text>
          <Text style={ui.money}>{formatCurrency(Number.isFinite(savings) ? savings : 0)}</Text>
        </View>
        <Text style={styles.caption}>Manage these amounts in Plan.</Text>
      </View>
      <View style={ui.card}>
        <View>
          <Text style={ui.label}>Current balance</Text>
          <CurrencyInput accessibilityLabel="Current balance" value={balance} error={!!error}
            onChangeText={(text) => { setBalance(text); setError(""); }} />
        </View>
        {!!error && <Text accessibilityRole="alert" style={ui.error}>{error}</Text>}
        <AppButton title="Calculate safe to spend" onPress={calculate} />
        <SaveStatus />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  result: { padding: 24, borderRadius: 20, backgroundColor: palette.soft, gap: 8 },
  warning: { backgroundColor: palette.dangerSoft },
  amount: { color: palette.text, fontSize: 42, fontWeight: "700", fontVariant: ["tabular-nums"], flexShrink: 1 },
  caption: { color: palette.muted, fontSize: 13, lineHeight: 19 },
});
