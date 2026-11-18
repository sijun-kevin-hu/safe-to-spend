import { SpendingRoom } from "@/components/home/spending-room";
import { PurchaseHome } from "@/components/home/purchase-home";
import { ActivitySheet } from "@/components/home/activity-sheet";
import { Snackbar } from "@/components/snackbar";
import { SaveStatus } from "@/components/plan/save-status";
import { AppButton } from "@/components/app-button";
import { CurrencyInput } from "@/components/currency-input";
import { Screen } from "@/components/screen";
import { palette, ui } from "@/constants/design";
import { usePlan } from "@/context/plan-context";
import { formatCurrency } from "@/lib/format";
import { useCallback, useEffect, useRef, useState } from "react";
import { BackHandler, Keyboard, StyleSheet, Text, View } from "react-native";

import { useIsFocused } from "expo-router";

type Action = "purchases" | "balance";

export default function HomeScreen() {
  const { trackingPreference } = usePlan();
  return <HomeMode key={trackingPreference} preference={trackingPreference ?? "purchases"} />;
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
  if (view === "purchases") return <PurchaseHome onBalance={() => setView("balance")} />;
  return <BalanceHome onPurchases={preference === "purchases" ? () => setView("purchases") : undefined}
    onUpdated={preference === "purchases" ? () => setView("purchases") : undefined} />;
}

function BalanceHome({ onPurchases, onUpdated }: {
  onPurchases?: () => void;
  onUpdated?: () => void;
}) {
  const { balance, balanceUpdatedAt, updateBalance, savingsReserved,
    validationError, billItems, purchases, saveState } = usePlan();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [activityOpen, setActivityOpen] = useState(false);
  const [confirmation, setConfirmation] = useState<{ id: number; message: string } | null>(null);
  const dismissConfirmation = useCallback(() => setConfirmation(null), []);
  const submitted = useRef(false);
  const { billsReserved: billsTotal } = usePlan();

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
    setNotice("Balance updated. Past purchases and income won’t be applied again.");
    setDraft("");
    setError("");
    onUpdated?.();
  }

  return <><Screen>
    <SpendingRoom />

    <View style={ui.card}>
      <Text accessibilityRole="header" style={ui.sectionTitle}>Your balance</Text>
      <Text style={styles.balance}>{formatCurrency(Number(balance))}</Text>
      <Text style={ui.body}>{balanceUpdatedAt
        ? `Balance last checked: ${formatTimestamp(balanceUpdatedAt)}`
        : "Confirm your current balance before logging purchases or income."}</Text>
      {purchases[0] && <Text style={styles.caption}>Last activity logged: {formatTimestamp(purchases[0].createdAt)}</Text>}
      <View style={styles.entry}>
        <Text accessibilityRole="header" style={ui.sectionTitle}>Balance check-in</Text>
        <Text style={ui.body}>{!balanceUpdatedAt && onUpdated
          ? "Set your starting balance once, then start logging purchases and income."
          : "Check your balance in your banking app, then enter it here. No need to log purchases or income."}</Text>
        <Text style={ui.label}>Current balance</Text>
        <CurrencyInput accessibilityLabel="Current balance" value={draft} error={!!error}
          onChangeText={(value) => { submitted.current = false; setDraft(value); setError(""); }} />
        {balanceUpdatedAt && <Text style={styles.caption}>Include your latest purchases and income. This replaces the balance above.</Text>}
        {!!error && <Text accessibilityRole="alert" style={ui.error}>{error}</Text>}
        <AppButton title="Update balance" disabled={saveState !== "saved"} onPress={submit} />
        <AppButton title={onUpdated ? "Back to logging" : "Log purchase or income"}
          variant="text" onPress={() => {
            Keyboard.dismiss();
            dismissConfirmation();
            if (onPurchases) onPurchases();
            else setActivityOpen(true);
          }} />
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
        <Text style={ui.body}>Savings reserve</Text>
        <Text style={ui.money}>{validationError ? "—" : formatCurrency(savingsReserved)}</Text>
      </View>
      <Text style={styles.caption}>Manage these amounts in Plan.</Text>
    </View>
  </Screen>
    {activityOpen && <ActivitySheet onClose={() => setActivityOpen(false)}
      onLogged={(message) => setConfirmation({ id: Date.now(), message })} />}
    {confirmation && <Snackbar key={confirmation.id} message={confirmation.message} onDismiss={dismissConfirmation} />}
  </>;
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  });
}

const styles = StyleSheet.create({
  balance: { ...ui.money, fontSize: 24 },
  entry: { gap: 12, borderTopWidth: 1, borderTopColor: palette.border, paddingTop: 20 },
  caption: { color: palette.muted, fontSize: 13, lineHeight: 19 },
});
