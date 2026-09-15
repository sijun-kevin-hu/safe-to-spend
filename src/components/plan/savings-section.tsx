import { CurrencyInput } from "@/components/currency-input";
import { palette, ui } from "@/constants/design";
import { usePlan } from "@/context/plan-context";
import { formatCurrency } from "@/lib/format";
import { Keyboard, Pressable, StyleSheet, Text, View } from "react-native";

export function SavingsSection() {
  const {
    balance,
    savingsMode,
    savingsValue,
    setSavingsValue,
    changeSavingsMode,
    savingsReserved,
    validationError,
  } = usePlan();
  const percentage = savingsMode === "percentage";

  return (
    <>
      <Text accessibilityRole="header" style={ui.title}>Savings</Text>
      <Text style={ui.body}>Choose how much to set aside before spending.</Text>
      <View style={ui.card}>
        <View style={styles.options}>
          {(["amount", "percentage"] as const).map((mode) => (
            <Pressable
              key={mode}
              accessibilityRole="radio"
              accessibilityState={{ checked: savingsMode === mode }}
              onPress={() => { Keyboard.dismiss(); changeSavingsMode(mode); }}
              style={({ pressed }) => [styles.option, savingsMode === mode && styles.selected, pressed && styles.pressed]}
            >
              <Text style={styles.optionText}>{mode === "amount" ? "Fixed amount" : "Percentage"}</Text>
            </Pressable>
          ))}
        </View>
        <View>
          <Text style={ui.label}>{percentage ? "Percentage of current balance" : "Amount to set aside"}</Text>
          <CurrencyInput
            accessibilityLabel={percentage ? "Savings percentage" : "Savings amount"}
            symbol={percentage ? "%" : "$"}
            value={savingsValue}
            onChangeText={setSavingsValue}
            error={!!validationError}
          />
        </View>
        {!!validationError && <Text accessibilityRole="alert" style={ui.error}>{validationError}</Text>}
        <Text style={ui.body}>
          {percentage
            ? "Your savings amount adjusts with your current balance. A zero or negative balance sets aside $0."
            : "This amount stays the same when your balance changes. Leave blank for no savings reserve."}
        </Text>
      </View>
      <View style={ui.card}>
        <Text style={ui.label}>Savings set aside</Text>
        <Text style={styles.total}>
          {!validationError && balance.trim() && Number.isFinite(savingsReserved)
            ? formatCurrency(savingsReserved)
            : "—"}
        </Text>
        {percentage && <Text style={ui.body}>Based on your current balance of {Number.isFinite(Number(balance)) ? formatCurrency(Number(balance)) : "—"}.</Text>}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  options: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  option: { flexGrow: 1, minHeight: 48, justifyContent: "center", alignItems: "center", padding: 12, borderRadius: 12, borderWidth: 2, borderColor: palette.border },
  selected: { borderColor: palette.accent, backgroundColor: palette.soft },
  optionText: { color: palette.text, fontWeight: "600", fontSize: 15 },
  pressed: { opacity: 0.6 },
  total: { ...ui.money, fontSize: 32 },
});
