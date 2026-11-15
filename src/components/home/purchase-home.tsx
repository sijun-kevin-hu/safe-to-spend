import { AppButton } from "@/components/app-button";
import { CurrencyInput } from "@/components/currency-input";
import { SaveStatus } from "@/components/plan/save-status";
import { Screen } from "@/components/screen";
import { palette, ui } from "@/constants/design";
import { usePlan } from "@/context/plan-context";
import { formatCurrency } from "@/lib/format";
import type { TransactionKind } from "@/lib/plan";
import { useEffect, useRef, useState } from "react";
import { Keyboard, StyleSheet, Text, TextInput, View } from "react-native";

export function PurchaseHome({ onBalance }: { onBalance: () => void }) {
  return <Screen><ActivityContent onBalance={onBalance} /></Screen>;
}

export function ActivityContent({ onBalance, compact = false, onSaved }: {
  onBalance: () => void;
  compact?: boolean;
  onSaved?: (message: string) => void;
}) {
  const { balance, balanceUpdatedAt, purchases, addTransaction, savingsReserved,
    savingsMode, billItems, validationError, saveState, supportsIncome } = usePlan();
  const [kind, setKind] = useState<TransactionKind>("purchase");
  const isIncome = kind === "income";
  const entryName = isIncome ? "Income" : "Purchase";
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pendingConfirmation, setPendingConfirmation] = useState("");
  const saveStarted = useRef(false);
  const submitted = useRef(false);
  const today = new Date().toDateString();
  const todayItems = purchases.filter((item) => (item.kind ?? "purchase") === kind &&
    new Date(item.createdAt).toDateString() === today);
  const todayTotal = todayItems.reduce((sum, item) => sum + item.amount, 0);
  const available = Number(balance) - savingsReserved - billItems.reduce((sum, item) => sum + item.amount, 0);

  useEffect(() => {
    if (!pendingConfirmation) return;
    // Wait for this entry's save cycle, rather than the pre-submission saved state.
    if (saveState !== "saved") {
      saveStarted.current = true;
    } else if (saveStarted.current) {
      saveStarted.current = false;
      setPendingConfirmation("");
      if (onSaved) onSaved(pendingConfirmation);
      else setNotice(pendingConfirmation);
    }
  }, [pendingConfirmation, saveState, onSaved]);

  function submit() {
    if (submitted.current || pendingConfirmation || saveState !== "saved" || !balanceUpdatedAt) return;
    if (isIncome && !supportsIncome) return;
    const value = Number(amount);
    if (!amount.trim() || !Number.isFinite(value) || value < 0.01 || value > 1e12) {
      setError(`Enter a valid ${kind} amount of at least $0.01.`);
      return;
    }
    submitted.current = true;
    Keyboard.dismiss();
    addTransaction(kind, value, note);
    setNotice("");
    setPendingConfirmation(`${entryName} logged · ${formatCurrency(value)}`);
    setAmount("");
    setNote("");
    setError("");
  }

  return <>
    {!compact && <View>
      <Text accessibilityRole="header" style={ui.title}>Log activity</Text>
      <Text style={ui.body}>Keep your balance up to date as you go.</Text>
    </View>}
    {!compact && <View style={styles.summary}>
      <View style={styles.summaryItem}>
        <Text style={ui.label}>{isIncome ? "Received today" : "Spent today"}</Text>
        <Text style={styles.total}>{formatCurrency(todayTotal)}</Text>
        <Text style={styles.caption}>{todayItems.length} {isIncome
          ? (todayItems.length === 1 ? "income entry" : "income entries")
          : (todayItems.length === 1 ? "purchase" : "purchases")}</Text>
      </View>
      <View style={styles.summaryItem}>
        <Text style={ui.label}>{available < 0 ? "Over your balance" : "Safe to spend"}</Text>
        <Text style={[styles.total, available < 0 && { color: palette.danger }]}>
          {balanceUpdatedAt && !validationError ? formatCurrency(Math.abs(available)) : "—"}
        </Text>
        <Text style={styles.caption}>After listed bills & savings</Text>
      </View>
    </View>}
    {!balanceUpdatedAt ? <View style={ui.card}>
      <Text style={ui.sectionTitle}>Start with your balance</Text>
      <Text style={ui.body}>Set your current balance once. Purchases subtract from it; income adds to it.</Text>
      <AppButton title="Set starting balance" onPress={onBalance} />
    </View> : <View style={ui.card}>
      <View style={styles.toggle}>
        {(["purchase", "income"] as const).map((value) => <View key={value} style={styles.toggleOption}>
          <AppButton title={value === "purchase" ? "Purchase" : "Income"}
            disabled={!!pendingConfirmation}
            selected={kind === value} variant={kind === value ? "primary" : "secondary"}
            onPress={() => {
              if (kind === value) return;
              setKind(value);
              setAmount("");
              setNote("");
              setError("");
              setNotice("");
              submitted.current = false;
            }} />
        </View>)}
      </View>
      <Text accessibilityRole="header" style={ui.sectionTitle}>{isIncome ? "Log income" : "Log a purchase"}</Text>
      {isIncome && !supportsIncome && <Text accessibilityRole="alert" style={ui.error}>
        Income logging isn’t available yet. You can update your balance instead.
      </Text>}
      {isIncome && <Text style={ui.body}>Only log money you’ve received that isn’t already included in your balance.</Text>}
      <View>
        <Text style={ui.label}>Amount</Text>
        <CurrencyInput accessibilityLabel={`${entryName} amount`} value={amount} error={!!error}
          editable={!pendingConfirmation}
          onChangeText={(value) => { submitted.current = false; setAmount(value); setError(""); }} />
      </View>
      <View>
        <Text style={ui.label}>{isIncome ? "Where from? (optional)" : "What was it? (optional)"}</Text>
        <TextInput accessibilityLabel={`${entryName} description (optional)`} value={note}
          editable={!pendingConfirmation}
          onChangeText={setNote} maxLength={120} placeholder={isIncome ? "Paycheck, tips, freelance…" : "Coffee, groceries, lunch…"}
          placeholderTextColor={palette.muted} style={ui.input} returnKeyType="done"
          onSubmitEditing={submit} />
      </View>
      {!!error && <Text accessibilityRole="alert" style={ui.error}>{error}</Text>}
      {isIncome && savingsMode === "percentage" && <Text style={styles.caption}>
        Your percentage savings reserve also updates with your balance.
      </Text>}
      <AppButton title={isIncome ? "Add income" : "Add purchase"}
        disabled={!!pendingConfirmation || saveState !== "saved" || (isIncome && !supportsIncome)} onPress={submit} />
      {!!notice && <Text accessibilityLiveRegion="polite" style={ui.body}>{notice}</Text>}
      <SaveStatus />
    </View>}

  </>;
}

const styles = StyleSheet.create({
  toggle: { flexDirection: "row", gap: 8 },
  toggleOption: { flex: 1 },
  summary: { backgroundColor: palette.soft, borderRadius: 16, padding: 20, flexDirection: "row", flexWrap: "wrap", gap: 20 },
  summaryItem: { flexGrow: 1, flexBasis: 120, gap: 4 },
  total: { ...ui.money, fontSize: 26 },
  caption: { color: palette.muted, fontSize: 13, lineHeight: 19 },
});
