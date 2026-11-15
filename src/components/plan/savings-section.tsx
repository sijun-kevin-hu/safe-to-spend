import { CurrencyInput } from "@/components/currency-input";
import { SavingsTasks } from "@/components/plan/savings-tasks";
import { palette, ui } from "@/constants/design";
import { usePlan } from "@/context/plan-context";
import { formatCurrency } from "@/lib/format";
import { Keyboard, Pressable, Text, View } from "react-native";

export function SavingsSection() {
  const { savingsMode, changeSavingsMode, savingsValue, setSavingsValue, savingsReserved,
    validationError, supportsSavingsTasks, saveState } = usePlan();
  const fixed = savingsMode === "incomeAmount";
  const legacy = savingsMode === "amount" || savingsMode === "percentage";
  return <>
    <Text accessibilityRole="header" style={ui.title}>Savings</Text>
    <View style={ui.card}>
      <Text style={ui.label}>From each income</Text>
      {legacy && <Text style={ui.body}>Your previous reserve is kept below. Choose how to save from future income.</Text>}
      <View role="radiogroup" aria-label="Savings method" style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        {(["income", "incomeAmount"] as const).map(mode => <Pressable key={mode} role="radio" aria-checked={savingsMode === mode}
          disabled={!supportsSavingsTasks || saveState !== "saved" || !!validationError} aria-disabled={!supportsSavingsTasks || saveState !== "saved" || !!validationError}
          onPress={() => { Keyboard.dismiss(); changeSavingsMode(mode); }}
          style={({ pressed }) => ({ minHeight: 48, padding: 12, flexGrow: 1, alignItems: "center", justifyContent: "center", borderRadius: 12, borderWidth: 2,
            borderColor: savingsMode === mode ? palette.accent : palette.border, backgroundColor: savingsMode === mode ? palette.soft : palette.surface, opacity: pressed || !supportsSavingsTasks ? 0.5 : 1 })}>
          <Text style={{ color: palette.text, fontWeight: "600" }}>{mode === "income" ? "Percentage" : "Fixed amount"}</Text>
        </Pressable>)}
      </View>
      {!supportsSavingsTasks && <Text style={ui.error}>Update the API to use savings cards.</Text>}
      {!legacy && <>
        <Text style={ui.label}>{fixed ? "Amount per income" : "Percentage per income"}</Text>
        <CurrencyInput accessibilityLabel={fixed ? "Income savings amount" : "Income savings percentage"} symbol={fixed ? "$" : "%"}
          value={savingsValue} onChangeText={setSavingsValue} error={!!validationError} editable={supportsSavingsTasks} />
        <Text style={ui.body}>{fixed ? "Up to this amount from each income you log." : !validationError ? `Every $100 logged → ${formatCurrency(Number(savingsValue))} set aside.` : "Choose a percentage from 0 to 100."}</Text>
      </>}
      {!!validationError && <Text accessibilityRole="alert" style={ui.error}>{validationError}</Text>}
    </View>
    <View style={[ui.card, { backgroundColor: palette.soft }]}>
      <Text style={ui.label}>Waiting to move</Text>
      <Text style={[ui.money, { fontSize: 32 }]}>{formatCurrency(savingsReserved)}</Text>
      <Text style={ui.body}>Already kept out of safe-to-spend.</Text>
    </View>
    <SavingsTasks />
  </>;
}
