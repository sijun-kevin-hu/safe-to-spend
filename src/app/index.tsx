import { PurchaseHome } from "@/components/home/purchase-home";
import { SaveStatus } from "@/components/plan/save-status";
import { AppButton } from "@/components/app-button";
import { CurrencyInput } from "@/components/currency-input";
import { Screen } from "@/components/screen";
import { palette, ui } from "@/constants/design";
import { usePlan } from "@/context/plan-context";
import { formatCurrency } from "@/lib/format";
import { useEffect, useRef, useState } from "react";
import { BackHandler, Keyboard, StyleSheet, Text, View } from "react-native";

import { useIsFocused } from "expo-router";

type Action = "purchases" | "balance";

export default function HomeScreen() {
  const { trackingPreference } = usePlan();
  return <HomeMode key={trackingPreference} preference={trackingPreference ?? "balance"} />;
}

function HomeMode({ preference }: { preference: Action }) {
  const [view, setView] = useState<Action>(preference);
  const isFocused = useIsFocused();
  useEffect(() => {
    if (!isFocused || view === preference) return;
    const listener = BackHandler.addEventListener("hardwareBackPress", () => {
      setView(preference);
      return true;
    });
    return () => listener.remove();
  }, [isFocused, view, preference]);
  if (view === "purchases") return <PurchaseHome
    onBalance={() => setView("balance")}
    onBack={preference === "balance" ? () => setView("balance") : undefined} />;
  return <BalanceHome onPurchases={() => setView("purchases")}
    onUpdated={preference === "purchases" ? () => setView("purchases") : undefined} />;
}

function BalanceHome({ onPurchases, onUpdated }: {
  onPurchases: () => void;
  onUpdated?: () => void;
}) {
  const { balance, balanceUpdatedAt, updateBalance, savingsReserved,
    validationError, billItems, purchases, saveState } = usePlan();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const submitted = useRef(false);
  const billsTotal = billItems.reduce((total, bill) => total + bill.amount, 0);
  const safeToSpend = balanceUpdatedAt && !validationError
    ? Number(balance) - billsTotal - savingsReserved : null;
  const overBudget = safeToSpend !== null && safeToSpend < 0;

  function submit() {
    if (submitted.current || saveState !== "saved") return;
    const amount = Number(draft);
    if (!draft.trim() || !Number.isFinite(amount) || Math.abs(amount) > 1e12) {
      setError("Enter a valid balance.");
      return;
    }
    submitted.current = true;
    Keyboard.dismiss();
    updateBalance(amount);
    setNotice("Balance updated. Past purchases won’t be subtracted again.");
    setDraft("");
    setError("");
    onUpdated?.();
  }

  let resultMessage = "Update your current balance to get started.";
  if (validationError) resultMessage = "Check your savings setting in Plan to see your spending room.";
  else if (safeToSpend !== null) resultMessage = overBudget
    ? "Your listed bills and savings exceed your current balance."
    : billItems.length > 0 && savingsReserved > 0
      ? "Your listed bills and savings are set aside."
      : "Based on what you entered. Add bills and savings in Plan for a fuller picture.";

  return <Screen>
    <Text accessibilityRole="header" style={ui.title}>Safe to Spend</Text>
    <View style={[styles.result, overBudget && styles.warning]} accessibilityLiveRegion="polite">
      <Text style={ui.label}>{overBudget ? "Amount over your balance" : "Safe to spend"}</Text>
      <Text style={styles.amount}>{safeToSpend === null ? "—" : formatCurrency(Math.abs(safeToSpend))}</Text>
      <Text style={ui.body}>{resultMessage}</Text>
    </View>

    <View style={ui.card}>
      <Text accessibilityRole="header" style={ui.sectionTitle}>Your balance</Text>
      <Text style={styles.balance}>{formatCurrency(Number(balance))}</Text>
      <Text style={ui.body}>{balanceUpdatedAt
        ? `Balance last checked: ${formatTimestamp(balanceUpdatedAt)}`
        : "Confirm your current balance before logging purchases."}</Text>
      {purchases[0] && <Text style={styles.caption}>Last purchase logged: {formatTimestamp(purchases[0].createdAt)}</Text>}
      <View style={styles.entry}>
        <Text accessibilityRole="header" style={ui.sectionTitle}>Balance check-in</Text>
        <Text style={ui.body}>{!balanceUpdatedAt && onUpdated
          ? "Set your starting balance once, then start logging purchases."
          : "Check your balance in your banking app, then enter it here. No purchase-by-purchase tracking needed."}</Text>
        <Text style={ui.label}>Current balance</Text>
        <CurrencyInput accessibilityLabel="Current balance" value={draft} error={!!error}
          onChangeText={(value) => { submitted.current = false; setDraft(value); setError(""); }} />
        {balanceUpdatedAt && <Text style={styles.caption}>Include your latest purchases. This replaces the balance above.</Text>}
        {!!error && <Text accessibilityRole="alert" style={ui.error}>{error}</Text>}
        <AppButton title="Update balance" disabled={saveState !== "saved"} onPress={submit} />
        <AppButton title={onUpdated ? "Back to purchases" : "Log or view purchases"}
          variant="text" onPress={onPurchases} />
      </View>
      {!!notice && <Text accessibilityLiveRegion="polite" style={ui.body}>{notice}</Text>}
      <SaveStatus />
    </View>

    <View style={ui.card}>
      <Text accessibilityRole="header" style={ui.sectionTitle}>Set aside</Text>
      <View style={ui.row}>
        <Text style={ui.body}>Upcoming bills</Text>
        <Text style={ui.money}>{formatCurrency(billsTotal)}</Text>
      </View>
      <View style={ui.row}>
        <Text style={ui.body}>Savings</Text>
        <Text style={ui.money}>{validationError ? "—" : formatCurrency(savingsReserved)}</Text>
      </View>
      <Text style={styles.caption}>Manage these amounts in Plan.</Text>
    </View>
  </Screen>;
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  });
}

const styles = StyleSheet.create({
  result: { padding: 24, borderRadius: 20, backgroundColor: palette.soft, gap: 8 },
  warning: { backgroundColor: palette.dangerSoft },
  amount: { color: palette.text, fontSize: 42, fontWeight: "700", fontVariant: ["tabular-nums"], flexShrink: 1 },
  balance: { ...ui.money, fontSize: 28 },
  entry: { gap: 12, borderTopWidth: 1, borderTopColor: palette.border, paddingTop: 20 },
  caption: { color: palette.muted, fontSize: 13, lineHeight: 19 },
});
