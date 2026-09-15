import { SaveStatus } from "@/components/plan/save-status";
import { AppButton } from "@/components/app-button";
import { CurrencyInput } from "@/components/currency-input";
import { Screen } from "@/components/screen";
import { palette, ui } from "@/constants/design";
import { usePlan } from "@/context/plan-context";
import { formatCurrency } from "@/lib/format";
import { useEffect, useRef, useState } from "react";
import { Keyboard, StyleSheet, Text, View } from "react-native";

type Action = "purchases" | "balance";

export default function HomeScreen() {
  const {
    balance, balanceUpdatedAt, trackingPreference, updateBalance, addPurchase,
    savingsReserved, validationError, billItems, purchases, saveState,
  } = usePlan();
  const [actionOverride, setActionOverride] = useState<Action | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const submitted = useRef(false);
  const [historyOverride, setHistoryOverride] = useState<boolean | null>(null);
  const billsTotal = billItems.reduce((total, bill) => total + bill.amount, 0);
  const safeToSpend = balanceUpdatedAt && !validationError
    ? Number(balance) - billsTotal - savingsReserved : null;
  const overBudget = safeToSpend !== null && safeToSpend < 0;
  const primaryAction = balanceUpdatedAt ? trackingPreference ?? "balance" : "balance";
  const action = actionOverride ?? primaryAction;
  const otherAction = action === "balance" ? "purchases" : "balance";
  const showHistory = historyOverride ?? trackingPreference === "purchases";
  const actionTitle = (value: Action) => value === "purchases" ? "Add purchase" : "Update balance";

  useEffect(() => {
    setActionOverride(null);
    setDraft("");
    setError("");
    setNotice("");
    setHistoryOverride(null);
    submitted.current = false;
  }, [trackingPreference]);

  function openAction(next: Action) {
    Keyboard.dismiss();
    submitted.current = false;
    setActionOverride(next === primaryAction ? null : next);
    setDraft("");
    setError("");
    setNotice("");
  }

  function submit() {
    if (submitted.current || saveState !== "saved") return;
    const amount = Number(draft);
    if (!draft.trim() || !Number.isFinite(amount) || Math.abs(amount) > 1e12) {
      setError("Enter a valid amount below one trillion dollars.");
      return;
    }
    if (action === "purchases" && amount < 0.01) {
      setError("Enter a purchase amount of at least $0.01.");
      return;
    }
    submitted.current = true;
    Keyboard.dismiss();
    if (action === "purchases") {
      addPurchase(amount);
      setNotice("Purchase added. Your balance includes this spending.");
    } else {
      updateBalance(amount);
      setNotice("Balance updated. Past purchases won’t be subtracted again.");
    }
    setActionOverride(null);
    setDraft("");
    setError("");
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
        <Text accessibilityRole="header" style={ui.sectionTitle}>
          {action === "purchases" ? "Log a purchase" : "Balance check-in"}
        </Text>
        <Text style={ui.body}>{action === "purchases"
          ? "Enter what you spent. Your available spending updates immediately."
          : !balanceUpdatedAt && trackingPreference === "purchases"
            ? "Set your starting balance once. After this, Home opens straight to purchase entry."
            : "Check your balance in your banking app, then enter it here. No purchase-by-purchase tracking needed."}</Text>
        <Text style={ui.label}>{action === "purchases" ? "Purchase amount" : "Current balance"}</Text>
        <CurrencyInput accessibilityLabel={action === "purchases" ? "Purchase amount" : "Current balance"}
          value={draft} error={!!error} onChangeText={(value) => {
            submitted.current = false;
            setDraft(value);
            setError("");
          }} />
        {action === "balance" && balanceUpdatedAt &&
          <Text style={styles.caption}>Include your latest purchases. This replaces the balance above.</Text>}
        {!!error && <Text accessibilityRole="alert" style={ui.error}>{error}</Text>}
        <AppButton title={actionTitle(action)} disabled={saveState !== "saved"} onPress={submit} />
        <AppButton title={actionOverride ? "Back to my usual tracking" : otherAction === "balance"
          ? "Update my balance instead" : "Log a purchase instead"}
          variant="text" disabled={!balanceUpdatedAt && otherAction === "purchases"}
          onPress={() => openAction(actionOverride ? primaryAction : otherAction)} />
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
    {(purchases.length > 0 || trackingPreference === "purchases") && <View style={ui.card}>
      <AppButton title={showHistory ? "Hide recent purchases" : "View recent purchases"}
        variant="text" onPress={() => setHistoryOverride(!showHistory)} />
      {showHistory && <>
        <Text style={ui.body}>{purchases.length
          ? "Your latest five entries. Already included in your balance when logged."
          : "Your purchases will appear here as you add them."}</Text>
        {purchases.slice(0, 5).map((purchase) => <View key={purchase.id} style={ui.row}>
          <Text style={[ui.body, styles.date]}>{formatTimestamp(purchase.createdAt)}</Text>
          <Text style={ui.money}>{formatCurrency(purchase.amount)}</Text>
        </View>)}
      </>}
    </View>}
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
  date: { flex: 1 },
});
