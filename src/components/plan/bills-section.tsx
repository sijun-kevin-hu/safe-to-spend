import { DueDateField } from "@/components/plan/due-date-field";
import { AppButton } from "@/components/app-button";
import { palette, ui } from "@/constants/design";
import { formatCurrency, formatBillDate, toDateOnly } from "@/lib/format";
import { CurrencyInput } from "@/components/currency-input";
import { usePlan } from "@/context/plan-context";
import type { Bill } from "@/types/bill";
import { useState } from "react";
import {
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export function BillsSection() {
  const { billItems, setBillItems } = usePlan();

  const billsTotal = billItems.reduce((total, bill) => total + bill.amount, 0);

  const [billName, setBillName] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [billDueDate, setBillDueDate] = useState<Date | null>(null);
  const [nameFocused, setNameFocused] = useState(false);
  const [billError, setBillError] = useState("");
  const addBill = () => {
    const parsedAmount = Number(billAmount);
    if (!billDueDate) {
      setBillError("Choose a due date.");
      return;
    }

    if (billName.trim() === "" || billAmount.trim() === "") {
      setBillError("Enter a bill name and amount.");
      return;
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
      setBillError("Enter a valid bill amount.");
      return;
    }

    const newBill: Bill = {
      id: Date.now().toString(),
      name: billName.trim(),
      amount: parsedAmount,
      dueDate: toDateOnly(billDueDate),
    };

    Keyboard.dismiss();
    setBillItems((currentBills) => [...currentBills, newBill]);
    setBillName("");
    setBillAmount("");
    setBillDueDate(null);
    setBillError("");
  };

  return (
    <>
      <Text accessibilityRole="header" style={ui.title}>Upcoming bills</Text>
      <View style={ui.card}>
        <View style={ui.row}>
          <Text accessibilityRole="header" style={[ui.sectionTitle, { flexShrink: 1 }]}>Total upcoming bills</Text>
          <Text style={ui.money}>{formatCurrency(billsTotal)}</Text>
        </View>
        {billItems.length === 0 && <Text style={ui.body}>No bills added. Add an upcoming bill below to set that money aside.</Text>}
        {billItems.map((bill) => (
          <View key={bill.id} style={styles.billItem}>
            <View style={styles.billDetails}>
              <Text style={styles.billName}>{bill.name}</Text>
              {!!bill.dueDate && <Text style={styles.billDate}>Due {formatBillDate(bill.dueDate)}</Text>}
            </View>
            <Text style={ui.money}>{formatCurrency(bill.amount)}</Text>
          </View>
        ))}

      </View>
      <View style={ui.card}>
        <Text accessibilityRole="header" style={ui.sectionTitle}>Add an upcoming bill</Text>
        <Text style={styles.sectionHint}>
          This amount will be protected from your safe-to-spend total.
        </Text>

        <Text style={styles.fieldLabel}>Bill name</Text>
        <TextInput
          value={billName}
          onChangeText={setBillName}
          placeholder="Rent, phone, utilities"
          placeholderTextColor="#667085"
          accessibilityLabel="Bill name"
          onFocus={() => setNameFocused(true)}
          onBlur={() => setNameFocused(false)}
          style={[ui.input, nameFocused && { borderColor: palette.accent }]}
          returnKeyType="done"
          onSubmitEditing={Keyboard.dismiss}
        />

        <Text style={styles.fieldLabel}>Amount</Text>
        <CurrencyInput
          accessibilityLabel="Bill amount"
          value={billAmount}
          onChangeText={setBillAmount}
        />

        <Text style={styles.fieldLabel}>Due date</Text>
        <DueDateField value={billDueDate} onChange={setBillDueDate} />

        {billError !== "" && (
          <Text accessibilityRole="alert" style={ui.error}>{billError}</Text>
        )}

        <AppButton title="Add bill" onPress={addBill} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  billItem: {
    flexDirection: "row", alignItems: "center", gap: 16,
    paddingTop: 16, borderTopWidth: 1, borderTopColor: palette.border
  },
  billDetails: { flex: 1, gap: 4 },
  billName: { color: palette.text, fontSize: 16, fontWeight: "600" },
  billDate: { color: palette.muted, fontSize: 14 },
  sectionHint: { ...ui.body },
  fieldLabel: { ...ui.label, marginBottom: -8 },
});
