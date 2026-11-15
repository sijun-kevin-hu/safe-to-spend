import { CurrencyInput } from "@/components/currency-input";
import { palette, ui } from "@/constants/design";
import { usePlan } from "@/context/plan-context";
import { formatCurrency } from "@/lib/format";
import { Keyboard, Pressable, StyleSheet, Text, View } from "react-native";

export function SavingsSection() {
  const { savingsMode, changeSavingsMode, savingsValue, setSavingsValue,
    savingsReserved, validationError, supportsIncomeSavings, incomeReserveValue, setIncomeReserveValue } = usePlan();
  const income = savingsMode === "income";
  const percentage = savingsMode !== "amount";

  return <>
    <Text accessibilityRole="header" style={ui.title}>Savings reserve</Text>
    <Text style={ui.body}>Set money aside before you spend.</Text>
    <View style={ui.card}>
      <View role="radiogroup" aria-label="Savings method" style={styles.options}>
        {(["amount", "percentage", "income"] as const).map((mode) => <Pressable key={mode}
          role="radio" aria-checked={savingsMode === mode} aria-disabled={mode === "income" && !supportsIncomeSavings}
          disabled={mode === "income" && !supportsIncomeSavings}
          onPress={() => { Keyboard.dismiss(); changeSavingsMode(mode); }}
          style={({ pressed }) => [styles.option, savingsMode === mode && styles.selected,
            mode === "income" && !supportsIncomeSavings && styles.disabled, pressed && styles.pressed]}>
          <Text style={styles.optionText}>{mode === "amount" ? "Fixed amount" : mode === "percentage" ? "Of balance" : "From income"}</Text>
        </Pressable>)}
      </View>
      {!supportsIncomeSavings && <Text style={styles.hint}>Income-based savings isn’t available yet. Your current savings setting still works.</Text>}
      <Text style={ui.label}>{income ? "Percentage of each income payment" : percentage ? "Percentage of current balance" : "Amount (optional)"}</Text>
      <CurrencyInput accessibilityLabel={income ? "Income savings percentage" : percentage ? "Savings reserve percentage" : "Savings reserve amount"}
        symbol={percentage ? "%" : "$"} value={savingsValue} onChangeText={setSavingsValue} error={!!validationError} />
      {income ? <>
        <Text style={ui.body}>Set aside this share of each income payment you log. Purchases and balance check-ins keep the reserve unchanged.</Text>
        <Text style={ui.label}>Already reserved</Text>
        <CurrencyInput accessibilityLabel="Income savings already reserved" value={incomeReserveValue}
          onChangeText={setIncomeReserveValue} error={!!validationError} />
        <Text style={styles.hint}>Only include savings still in this balance. Adjust this amount when you use savings or move it to another account.</Text>
      </> : <Text style={ui.body}>{percentage
        ? "Your reserve changes with your balance, including after purchases and income. A zero or negative balance reserves $0."
        : "Excluded from safe-to-spend until you change it. Include only money still in your current balance. Leave blank for no reserve."}</Text>}
      {!!validationError && <Text accessibilityRole="alert" style={ui.error}>{validationError}</Text>}
    </View>
    <View style={ui.card}>
      <Text style={ui.label}>Reserved now</Text>
      <Text style={styles.reserved}>{!validationError && Number.isFinite(savingsReserved) ? formatCurrency(savingsReserved) : "—"}</Text>
      {income && <Text style={styles.hint}>A reserve, not a bank transfer. Log received income to add savings; a balance check-in alone won’t add any.</Text>}
    </View>
  </>;
}

const styles = StyleSheet.create({
  options: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  option: { flexGrow: 1, minHeight: 48, justifyContent: "center", alignItems: "center", padding: 12, borderRadius: 12, borderWidth: 2, borderColor: palette.border },
  selected: { borderColor: palette.accent, backgroundColor: palette.soft },
  optionText: { color: palette.text, fontWeight: "600", fontSize: 15 },
  hint: { ...ui.body, fontSize: 13, lineHeight: 19 },
  reserved: { ...ui.money, fontSize: 24 },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.6 },
});
