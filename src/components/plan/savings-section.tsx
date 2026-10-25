import { CurrencyInput } from "@/components/currency-input";
import { ui } from "@/constants/design";
import { usePlan } from "@/context/plan-context";
import { Text, View } from "react-native";

export function SavingsSection() {
  const { savingsValue, setSavingsValue, validationError } = usePlan();

  return (
    <>
      <Text accessibilityRole="header" style={ui.title}>Savings reserve</Text>
      <Text style={ui.body}>Excluded from safe-to-spend until you change it.</Text>
      <View style={ui.card}>
        <Text style={ui.label}>Amount (optional)</Text>
        <CurrencyInput
          accessibilityLabel="Savings reserve"
          symbol="$"
          value={savingsValue}
          onChangeText={setSavingsValue}
          error={!!validationError}
        />
        {!!validationError && <Text accessibilityRole="alert" style={ui.error}>{validationError}</Text>}
        <Text style={ui.body}>Include only money still in your current balance. Leave blank for no reserve.</Text>
      </View>
    </>
  );
}
