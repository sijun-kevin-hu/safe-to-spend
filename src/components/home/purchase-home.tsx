import { SpendingRoom } from "@/components/home/spending-room";
import { SavingsTasks } from "@/components/plan/savings-tasks";
import { Snackbar } from "@/components/snackbar";
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
  const { savingsMethodMessage, dismissSavingsMethodMessage } = usePlan();
  return <><Screen><ActivityContent onBalance={onBalance} /><SavingsTasks compact /></Screen>
    {!!savingsMethodMessage && <Snackbar message={savingsMethodMessage} onDismiss={dismissSavingsMethodMessage} />}</>;
}

export function ActivityContent({ onBalance, compact = false, onSaved }: {
  onBalance: () => void;
  compact?: boolean;
  onSaved?: (message: string) => void;
}) {
  const { balanceUpdatedAt, purchases, addTransaction,
    savingsMode, savingsValue, validationError, saveState, supportsIncome } = usePlan();
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
  const now = new Date();
  const monthItems = purchases.filter((item) => {
    if ((item.kind ?? "purchase") !== "purchase") return false;
    const date = new Date(item.createdAt);
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  });
  const monthTotal = monthItems.reduce((sum, item) => sum + item.amount, 0);

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
    {!compact && <>
      <SpendingRoom />
      <View style={styles.monthSummary}>
        <View style={styles.monthDescription}>
          <Text style={styles.monthLabel}>Spent this month</Text>
          <Text style={styles.caption}>Logged purchases · {now.toLocaleDateString(undefined, { month: "long" })}</Text>
        </View>
        <Text style={styles.monthTotal}>{formatCurrency(monthTotal)}</Text>
      </View>
    </>}
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
      {isIncome && (savingsMode === "income" || savingsMode === "incomeAmount") && <Text style={styles.caption}>
        {Number.isFinite(Number(amount)) && Number(amount) >= 0.01 && !validationError
          ? `${formatCurrency(savingsMode === "incomeAmount" ? Math.min(Number(amount), Number(savingsValue)) : Math.round(Number(amount) * Number(savingsValue)) / 100)} set aside for savings.`
          : savingsMode === "incomeAmount" ? `Up to ${formatCurrency(Number(savingsValue))} will be set aside.` : `${savingsValue}% will be set aside.`}
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
  monthSummary: { paddingHorizontal: 4, flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 12 },
  monthDescription: { flexGrow: 1, gap: 4 },
  monthLabel: { color: palette.muted, fontSize: 14, fontWeight: "600" },
  monthTotal: { ...ui.money, fontSize: 24, flexShrink: 1 },
  caption: { color: palette.muted, fontSize: 13, lineHeight: 19 },
});
