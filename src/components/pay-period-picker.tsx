import { usePlan } from "@/context/plan-context";
import { AppButton } from "./app-button";
import { CalendarDateField } from "./calendar-date-field";
import { ui } from "@/constants/design";
import { formatBillDate, toDateOnly } from "@/lib/format";
import { payFrequencies, periodEnd, type PayPeriod } from "@/lib/pay-period";
import { Text, View } from "react-native";

export function defaultPayPeriod(): PayPeriod {
  const next = new Date(); next.setDate(next.getDate() + 14);
  return { frequency: "biweekly", nextPayday: toDateOnly(next) };
}
export function PayPeriodPicker({ value, onChange }: { value: PayPeriod; onChange: (value: PayPeriod) => void }) {
  const [y, m, d] = periodEnd(value, toDateOnly(new Date())).split("-").map(Number);
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  return <View style={{ gap: 12 }}>
    <Text accessibilityRole="header" style={ui.sectionTitle}>Pay period</Text>
    <Text style={ui.body}>How often do you get paid? Your safe-to-spend amount covers today until your next payday.</Text>
    {payFrequencies.map(f => <AppButton key={f.value} title={f.label}
      selected={value.frequency === f.value} variant={value.frequency === f.value ? "primary" : "secondary"}
      onPress={() => onChange({ ...value, frequency: f.value })} />)}
    {value.frequency !== "semimonthly" && <>
      <Text style={ui.label}>Next payday</Text>
      <CalendarDateField value={new Date(y, m - 1, d)} minimumDate={tomorrow}
        accessibilityLabel="Next payday" placeholder="Choose next payday"
        onChange={date => onChange({ ...value, nextPayday: toDateOnly(date) })} />
    </>}
    <Text style={ui.body}>Reserves overdue bills and payments due before {formatBillDate(periodEnd(value, toDateOnly(new Date())))}. Bills due on payday belong to the next period. Savings stay reserved; expected income is only added when received.</Text>
  </View>;
}
export function PayPeriodSettings() {
  const { payPeriod, setPayPeriod, supportsPayPeriod } = usePlan();
  return supportsPayPeriod ? <PayPeriodPicker value={payPeriod ?? defaultPayPeriod()} onChange={setPayPeriod} />
    : <Text style={ui.body}>Pay period settings need an updated API.</Text>;
}
