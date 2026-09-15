import { AppButton } from "@/components/app-button";
import { Screen } from "@/components/screen";
import { palette, ui } from "@/constants/design";
import { formatCurrency, formatBillDate, toDateOnly } from "@/lib/format";
import { CurrencyInput } from "@/components/currency-input";
import { PlanActions } from "@/components/plan-actions";
import { usePlan } from "@/context/plan-context";
import type { Bill } from "@/types/bill";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import {
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export default function PlanScreen() {
  const { balance, savingsGoal, setSavingsGoal, billItems, setBillItems } =
    usePlan();

  const billsTotal = billItems.reduce((total, bill) => total + bill.amount, 0);

  const [billName, setBillName] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [billDueDate, setBillDueDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);
  const [billError, setBillError] = useState("");
  const [savingsError, setSavingsError] = useState("");

  const handleSavingsChange = (text: string) => {
    setSavingsGoal(text);

    if (text.trim() === "") {
      setSavingsError("");
      return;
    }

    const amount = Number(text);

    if (!Number.isFinite(amount) || amount < 0) {
      setSavingsError("Enter a valid savings amount.");
      return;
    }

    setSavingsError("");
  };

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

    setBillItems((currentBills) => [...currentBills, newBill]);
    setBillName("");
    setBillAmount("");
    setBillDueDate(null);
    setShowDatePicker(false);
    setBillError("");
  };

  return (
    <Screen>
      <Text accessibilityRole="header" style={ui.title}>Your plan</Text>
      <Text style={styles.description}>
        Protect money for upcoming bills and savings.
      </Text>

      <Text style={styles.description}>
        Current balance: {balance === "" ? "Not entered" : formatCurrency(Number(balance))}
      </Text>

      <View style={ui.card}>
        <Text accessibilityRole="header" style={ui.sectionTitle}>Savings</Text>
        <Text style={ui.body}>Set aside an amount before spending. This is optional.</Text>
        <Text style={ui.label}>Savings goal</Text>
        <CurrencyInput
          error={!!savingsError}
          accessibilityLabel="Savings goal"
          value={savingsGoal}
          onChangeText={handleSavingsChange}
        />

        {savingsError !== "" && (
          <Text accessibilityRole="alert" style={ui.error}>{savingsError}</Text>
        )}

      </View>
      <View style={ui.card}>
        <View style={ui.row}>
          <Text accessibilityRole="header" style={[ui.sectionTitle, { flexShrink: 1 }]}>Upcoming bills</Text>
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
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            Keyboard.dismiss();
            setShowDatePicker(true);
          }}
          style={({ pressed }) => [styles.dateButton, pressed && { opacity: 0.6 }]}
        >
          <Text
            style={billDueDate ? styles.dateText : styles.datePlaceholder}
          >
            {billDueDate
              ? billDueDate.toLocaleDateString()
              : "Choose a due date"}
          </Text>
        </Pressable>

        {showDatePicker && (
          <View style={styles.datePickerPanel}>
            <DateTimePicker
              value={billDueDate ?? new Date()}
              mode="date"
              minimumDate={new Date()}
              display={Platform.OS === "ios" ? "inline" : "default"}
              themeVariant="light"
              accentColor="#167D5A"
              onChange={(_event, selectedDate) => {
                if (Platform.OS === "android") {
                  setShowDatePicker(false);
                }
                if (selectedDate) {
                  setBillDueDate(selectedDate);
                }
              }}
            />

            {Platform.OS === "ios" && (
              <AppButton title="Done" variant="secondary" onPress={() => setShowDatePicker(false)} />
            )}
          </View>
        )}

        {billError !== "" && (
          <Text accessibilityRole="alert" style={ui.error}>{billError}</Text>
        )}

        <AppButton title="Add bill" variant="secondary" onPress={addBill} />
      </View>
      <PlanActions />
    </Screen>
  );
}

const styles = StyleSheet.create({
  description: { ...ui.body, marginTop: -12 },
  billItem: {
    flexDirection: "row", alignItems: "center", gap: 16,
    paddingTop: 16, borderTopWidth: 1, borderTopColor: palette.border
  },
  billDetails: { flex: 1, gap: 4 },
  billName: { color: palette.text, fontSize: 16, fontWeight: "600" },
  billDate: { color: palette.muted, fontSize: 14 },
  sectionHint: { ...ui.body },
  fieldLabel: { ...ui.label, marginBottom: -8 },
  dateButton: { ...ui.input, justifyContent: "center" },
  dateText: { color: palette.text, fontSize: 16 },
  datePlaceholder: { color: palette.muted, fontSize: 16 },
  datePickerPanel: { borderRadius: 12, backgroundColor: palette.surface, overflow: "hidden" },
});
