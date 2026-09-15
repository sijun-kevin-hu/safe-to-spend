import { AppButton } from "@/components/app-button";
import { CurrencyInput } from "@/components/currency-input";
import { SaveStatus } from "@/components/plan/save-status";
import { Screen } from "@/components/screen";
import { palette, ui } from "@/constants/design";
import { usePlan } from "@/context/plan-context";
import { formatCurrency } from "@/lib/format";
import { useRef, useState } from "react";
import { Keyboard, StyleSheet, Text, TextInput, View } from "react-native";

export function PurchaseHome({ onBalance, onBack }: {
  onBalance: () => void;
  onBack?: () => void;
}) {
  const { balance, balanceUpdatedAt, purchases, addPurchase, savingsReserved,
    billItems, validationError, saveState } = usePlan();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [visibleCount, setVisibleCount] = useState(20);
  const submitted = useRef(false);
  const today = new Date().toDateString();
  const todayItems = purchases.filter((item) => new Date(item.createdAt).toDateString() === today);
  const todayTotal = todayItems.reduce((sum, item) => sum + item.amount, 0);
  const available = Number(balance) - savingsReserved - billItems.reduce((sum, item) => sum + item.amount, 0);
  const visiblePurchases = purchases.slice(0, visibleCount);

  function submit() {
    if (submitted.current || saveState !== "saved" || !balanceUpdatedAt) return;
    const value = Number(amount);
    if (!amount.trim() || !Number.isFinite(value) || value < 0.01 || value > 1e12) {
      setError("Enter a valid purchase amount of at least $0.01.");
      return;
    }
    submitted.current = true;
    Keyboard.dismiss();
    addPurchase(value, note);
    setNotice(`${note.trim() || "Purchase"} added · ${formatCurrency(value)}`);
    setAmount("");
    setNote("");
    setError("");
  }

  return <Screen>
    {onBack && <AppButton title="‹ Back to balance check-in" variant="text" onPress={onBack} />}
    <View>
      <Text accessibilityRole="header" style={ui.title}>Your purchases</Text>
      <Text style={ui.body}>Log it now. Find it here later.</Text>
    </View>
    <View style={styles.summary}>
      <View style={styles.summaryItem}>
        <Text style={ui.label}>Logged today</Text>
        <Text style={styles.total}>{formatCurrency(todayTotal)}</Text>
        <Text style={styles.caption}>{todayItems.length} {todayItems.length === 1 ? "purchase" : "purchases"}</Text>
      </View>
      <View style={styles.summaryItem}>
        <Text style={ui.label}>{available < 0 ? "Over your balance" : "Safe to spend"}</Text>
        <Text style={[styles.total, available < 0 && { color: palette.danger }]}>
          {balanceUpdatedAt && !validationError ? formatCurrency(Math.abs(available)) : "—"}
        </Text>
        <Text style={styles.caption}>After listed bills & savings</Text>
      </View>
    </View>
    {!balanceUpdatedAt ? <View style={ui.card}>
      <Text style={ui.sectionTitle}>Start with your balance</Text>
      <Text style={ui.body}>Set your current balance once. Each purchase you add will update it.</Text>
      <AppButton title="Set starting balance" onPress={onBalance} />
    </View> : <View style={ui.card}>
      <Text accessibilityRole="header" style={ui.sectionTitle}>Add a purchase</Text>
      <View>
        <Text style={ui.label}>Amount</Text>
        <CurrencyInput accessibilityLabel="Purchase amount" value={amount} error={!!error}
          onChangeText={(value) => { submitted.current = false; setAmount(value); setError(""); }} />
      </View>
      <View>
        <Text style={ui.label}>What was it? (optional)</Text>
        <TextInput accessibilityLabel="Purchase description (optional)" value={note}
          onChangeText={setNote} maxLength={120} placeholder="Coffee, groceries, lunch…"
          placeholderTextColor={palette.muted} style={ui.input} returnKeyType="done"
          onSubmitEditing={submit} />
      </View>
      {!!error && <Text accessibilityRole="alert" style={ui.error}>{error}</Text>}
      <AppButton title="Add purchase" disabled={saveState !== "saved"} onPress={submit} />
      {!!notice && <Text accessibilityLiveRegion="polite" style={ui.body}>{notice}</Text>}
      <SaveStatus />
    </View>}

    <View style={ui.card}>
      <Text accessibilityRole="header" style={ui.sectionTitle}>Purchase history</Text>
      {purchases.length === 0 ? <>
        <Text style={ui.body}>No purchases yet.</Text>
        <Text style={styles.caption}>Add your first purchase above. We’ll keep the amount, description, and time here.</Text>
      </> : <>
        {visiblePurchases.map((purchase, index) => {
          const date = new Date(purchase.createdAt);
          const previous = index > 0 ? new Date(visiblePurchases[index - 1].createdAt) : null;
          const startsDay = !previous || date.toDateString() !== previous.toDateString();
          return <View key={purchase.id} style={styles.historyItem}>
            {startsDay && <Text style={styles.day}>{date.toDateString() === today ? "Today" :
              date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</Text>}
            <View style={ui.row}>
              <View style={styles.description}>
                <Text style={styles.purchaseName}>{purchase.note || "Purchase"}</Text>
                <Text style={styles.caption}>{date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</Text>
              </View>
              <Text style={ui.money}>{formatCurrency(purchase.amount)}</Text>
            </View>
          </View>;
        })}
        {purchases.length > visibleCount && <AppButton title="Show older purchases" variant="secondary"
          onPress={() => setVisibleCount((count) => count + 20)} />}
        <Text style={styles.caption}>Logged purchases only. Already deducted when added.</Text>
      </>}
    </View>
    {balanceUpdatedAt && <View style={styles.balanceFooter}>
      <Text style={ui.body}>Current balance · {formatCurrency(Number(balance))}</Text>
      <AppButton title="Update my balance" variant="text" onPress={onBalance} />
    </View>}
  </Screen>;
}

const styles = StyleSheet.create({
  summary: { backgroundColor: palette.soft, borderRadius: 16, padding: 20, flexDirection: "row", flexWrap: "wrap", gap: 20 },
  summaryItem: { flexGrow: 1, flexBasis: 120, gap: 4 },
  total: { ...ui.money, fontSize: 26 },
  caption: { color: palette.muted, fontSize: 13, lineHeight: 19 },
  historyItem: { gap: 12 },
  day: { ...ui.label, marginBottom: 0, paddingTop: 8 },
  description: { flex: 1, gap: 4 },
  purchaseName: { color: palette.text, fontSize: 16, fontWeight: "500" },
  balanceFooter: { alignItems: "center", gap: 4 },
});
