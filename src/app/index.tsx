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
  const [action, setAction] = useState<Action | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const submitted = useRef(false);
  const [showHistory, setShowHistory] = useState(false);
  const billsTotal = billItems.reduce((total, bill) => total + bill.amount, 0);
  const safeToSpend = balanceUpdatedAt && !validationError
    ? Number(balance) - billsTotal - savingsReserved : null;
  const overBudget = safeToSpend !== null && safeToSpend < 0;
  const primaryAction = balanceUpdatedAt ? trackingPreference ?? "balance" : "balance";
  const secondaryAction = primaryAction === "balance" ? "purchases" : "balance";
  const actionTitle = (value: Action) => value === "purchases" ? "Add purchase" : "Update balance";

  useEffect(() => {
    setAction(null);
    setDraft("");
    setError("");
    setNotice("");
  }, [trackingPreference]);

  function openAction(next: Action) {
    Keyboard.dismiss();
    submitted.current = false;
    setAction(next);
    setDraft(next === "balance" && balanceUpdatedAt ? balance : "");
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
    setAction(null);
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
      {action === null ? <>
        <AppButton title={actionTitle(primaryAction)} onPress={() => openAction(primaryAction)} />
        <AppButton title={actionTitle(secondaryAction)} variant="secondary"
          disabled={secondaryAction === "purchases" && !balanceUpdatedAt}
          onPress={() => openAction(secondaryAction)} />
      </> : <>
        <Text style={ui.label}>{action === "purchases" ? "Purchase amount" : "Current balance"}</Text>
        <CurrencyInput accessibilityLabel={action === "purchases" ? "Purchase amount" : "Current balance"}
          value={draft} error={!!error} onChangeText={(value) => { setDraft(value); setError(""); }} />
        <Text style={ui.body}>{action === "purchases"
          ? "Today’s purchase will be deducted from your balance."
          : "Use a balance that includes your latest purchases. This replaces the balance above."}</Text>
        {!!error && <Text accessibilityRole="alert" style={ui.error}>{error}</Text>}
        <AppButton title={actionTitle(action)} disabled={saveState !== "saved"} onPress={submit} />
        <AppButton title="Cancel" variant="text" onPress={() => { Keyboard.dismiss(); setAction(null); setError(""); }} />
      </>}
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
    {purchases.length > 0 && <View style={ui.card}>
      <AppButton title={showHistory ? "Hide recent purchases" : "View recent purchases"}
        variant="text" onPress={() => setShowHistory(!showHistory)} />
      {showHistory && <>
        <Text style={ui.body}>Your latest five entries. Already included in your balance when logged.</Text>
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
  caption: { color: palette.muted, fontSize: 13, lineHeight: 19 },
  date: { flex: 1 },
});
