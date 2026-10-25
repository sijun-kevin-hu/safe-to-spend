import { CurrencyInput } from "@/components/currency-input";
import { palette, ui } from "@/constants/design";
import { usePlan } from "@/context/plan-context";
import { formatCurrency } from "@/lib/format";
import { Keyboard, Pressable, StyleSheet, Text, View } from "react-native";

export function SavingsSection() {
  const { savingsMode, changeSavingsMode, savingsValue, setSavingsValue,
    savingsReserved, validationError } = usePlan();
  const percentage = savingsMode === "percentage";

  return (
    <>
      <Text accessibilityRole="header" style={ui.title}>Savings reserve</Text>
      <Text style={ui.body}>Choose how much of your current balance to exclude from safe-to-spend.</Text>
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
        <Text style={ui.label}>{percentage ? "Percentage of current balance" : "Amount (optional)"}</Text>
        <CurrencyInput
          accessibilityLabel={percentage ? "Savings reserve percentage" : "Savings reserve amount"}
          symbol={percentage ? "%" : "$"}
          value={savingsValue}
          onChangeText={setSavingsValue}
          error={!!validationError}
        />
        {!!validationError && <Text accessibilityRole="alert" style={ui.error}>{validationError}</Text>}
        <Text style={ui.body}>{percentage
          ? "Your reserve changes with your balance, including after purchases. A zero or negative balance reserves $0."
          : "Excluded from safe-to-spend until you change it. Include only money still in your current balance. Leave blank for no reserve."}</Text>
      </View>
      <View style={ui.card}>
        <Text style={ui.label}>Reserved now</Text>
        <Text style={ui.money}>{!validationError && Number.isFinite(savingsReserved) ? formatCurrency(savingsReserved) : "—"}</Text>
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
});
