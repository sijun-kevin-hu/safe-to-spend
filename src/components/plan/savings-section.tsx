import { AppButton } from "@/components/app-button";
import { CurrencyInput } from "@/components/currency-input";
import { palette, ui } from "@/constants/design";
import { usePlan } from "@/context/plan-context";
import { formatCurrency } from "@/lib/format";
import { useState } from "react";
import { Keyboard, Pressable, StyleSheet, Text, View } from "react-native";

export function SavingsSection() {
  const { savingsMode, changeSavingsMode, savingsValue, setSavingsValue,
    savingsReserved, validationError, supportsIncomeSavings, incomeReserveValue, setIncomeReserveValue } = usePlan();
  const [adjusting, setAdjusting] = useState(false);
  const [focusedControl, setFocusedControl] = useState<string | null>(null);
  const income = savingsMode === "income";
  const percentage = savingsMode !== "amount";
  const rate = Number(savingsValue);
  const validRate = !!savingsValue.trim() && Number.isFinite(rate) && rate >= 0 && rate <= 100;

  return <>
    <Text accessibilityRole="header" style={ui.title}>Savings</Text>
    <View style={ui.card}>
      <Text style={ui.label}>How do you want to save?</Text>
      <View role="radiogroup" aria-label="Savings method" style={styles.options}>
        {(["income", "amount", "percentage"] as const).map((mode) => <Pressable key={mode}
          role="radio" aria-checked={savingsMode === mode} aria-disabled={mode === "income" && !supportsIncomeSavings}
          disabled={mode === "income" && !supportsIncomeSavings}
          onPress={() => { Keyboard.dismiss(); setAdjusting(false); changeSavingsMode(mode); }}
          onFocus={() => setFocusedControl(mode)} onBlur={() => setFocusedControl(null)}
          style={({ pressed }) => [styles.option, savingsMode === mode && styles.selected,
            mode === "income" && !supportsIncomeSavings && styles.disabled, focusedControl === mode && styles.focused, pressed && styles.pressed]}>
          <Text style={[styles.optionText, savingsMode === mode && styles.selectedText]}>{mode === "amount" ? "Fixed amount" : mode === "percentage" ? "Of balance" : "From income"}</Text>
        </Pressable>)}
      </View>
      {!supportsIncomeSavings && <Text style={styles.hint}>From income isn’t available yet.</Text>}
      <View>
        <Text style={ui.label}>{income ? "Save from each income" : percentage ? "Save from your balance" : "Amount to set aside"}</Text>
        <CurrencyInput accessibilityLabel={income ? "Income savings percentage" : percentage ? "Savings reserve percentage" : "Savings reserve amount"}
          symbol={percentage ? "%" : "$"} value={savingsValue} onChangeText={setSavingsValue} error={!!validationError} />
      </View>
      {income ? <>
        {validRate && <View style={styles.example}>
          <Text style={styles.exampleLabel}>For every $100 you log</Text>
          <Text style={styles.exampleAmount}>{formatCurrency(rate)} to savings</Text>
        </View>}
        <Text style={styles.hint}>Adds to savings when you log income.</Text>
      </> : <Text style={styles.hint}>{percentage
        ? "Adjusts as your balance changes."
        : "Kept out of your spending money."}</Text>}
      {!!validationError && <Text accessibilityRole="alert" style={ui.error}>{validationError}</Text>}
    </View>
    <View style={[ui.card, styles.summary]}>
      <View style={styles.totalRow}>
        <View style={styles.total}>
          <Text style={styles.totalLabel}>Set aside</Text>
          <Text style={styles.reserved}>{!validationError && Number.isFinite(savingsReserved) ? formatCurrency(savingsReserved) : "—"}</Text>
        </View>
        {income && <Pressable accessibilityRole="button" accessibilityLabel="Adjust savings set aside"
          accessibilityState={{ expanded: adjusting }} onPress={() => setAdjusting(!adjusting)}
          onFocus={() => setFocusedControl("adjust")} onBlur={() => setFocusedControl(null)}
          style={({ pressed }) => [styles.adjust, focusedControl === "adjust" && styles.focused, pressed && styles.pressed]}>
          <Text style={styles.selectedText}>{adjusting ? "Close" : "Adjust"}</Text>
        </Pressable>}
      </View>
      <Text style={styles.hint}>Still in your balance, kept out of safe-to-spend.</Text>
      {income && adjusting && <View style={styles.adjustment}>
        <Text style={ui.label}>Amount set aside</Text>
        <CurrencyInput accessibilityLabel="Income savings already reserved" value={incomeReserveValue}
          onChangeText={setIncomeReserveValue} error={!!validationError} />
        <Text style={styles.hint}>Update this if you use savings or move it out of this balance.</Text>
        <AppButton title="Done" variant="secondary" disabled={!!validationError}
          onPress={() => { Keyboard.dismiss(); setAdjusting(false); }} />
      </View>}
    </View>
  </>;
}

const styles = StyleSheet.create({
  options: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  option: { flexGrow: 1, minHeight: 48, justifyContent: "center", alignItems: "center", paddingHorizontal: 10, paddingVertical: 12, borderRadius: 12, borderWidth: 2, borderColor: palette.border },
  selected: { borderColor: palette.accent, backgroundColor: palette.soft },
  optionText: { color: palette.muted, fontWeight: "600", fontSize: 14 },
  selectedText: { color: palette.accent, fontWeight: "600", fontSize: 14 },
  hint: { ...ui.body, fontSize: 14, lineHeight: 20 },
  example: { borderLeftWidth: 3, borderLeftColor: palette.accent, paddingLeft: 14, gap: 4 },
  exampleLabel: { ...ui.body, fontSize: 14 },
  exampleAmount: { color: palette.text, fontSize: 20, fontWeight: "600", fontVariant: ["tabular-nums"] },
  summary: { backgroundColor: palette.soft },
  totalRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" },
  total: { gap: 6, flexShrink: 1 },
  totalLabel: { color: palette.muted, fontSize: 14, fontWeight: "600" },
  reserved: { ...ui.money, fontSize: 32 },
  adjust: { minHeight: 44, padding: 12, justifyContent: "center", borderRadius: 12, borderWidth: 2, borderColor: "transparent" },
  adjustment: { borderTopWidth: 1, borderTopColor: palette.border, paddingTop: 16, gap: 12 },
  focused: { borderColor: palette.text },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.6 },
});
