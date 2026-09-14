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
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export default function PlanScreen() {
  const { balance, savingsGoal, setSavingsGoal, billItems, setBillItems } =
    usePlan();

  const [billName, setBillName] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [billDueDate, setBillDueDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
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
      dueDate: billDueDate ? billDueDate.toISOString().slice(0, 10) : "",
    };

    setBillItems((currentBills) => [...currentBills, newBill]);
    setBillName("");
    setBillAmount("");
    setBillDueDate(null);
    setShowDatePicker(false);
    setBillError("");
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
    >
      <Pressable onPress={Keyboard.dismiss} accessible={false}>
        <Text style={styles.title}>Your Plan</Text>
        <Text style={styles.description}>
          Protect money for upcoming bills and savings.
        </Text>

        <Text style={styles.description}>
          Current balance: {balance === "" ? "Not entered" : `$${balance}`}
        </Text>

        <Text style={styles.label}>Savings goal</Text>
        <CurrencyInput
          accessibilityLabel="Savings goal"
          value={savingsGoal}
          onChangeText={handleSavingsChange}
        />

        {savingsError !== "" && (
          <Text style={styles.errorText}>{savingsError}</Text>
        )}

        {billItems.map((bill) => (
          <View key={bill.id} style={styles.billItem}>
            <Text style={styles.billName}>{bill.name}</Text>
            <Text style={styles.billAmount}>${bill.amount.toFixed(2)}</Text>
            {bill.dueDate !== "" && (
              <Text style={styles.billDate}>Due {bill.dueDate}</Text>
            )}
          </View>
        ))}

        <View style={styles.billCard}>
          <Text style={styles.sectionTitle}>Add an upcoming bill</Text>
          <Text style={styles.sectionHint}>
            This amount will be protected from your safe-to-spend total.
          </Text>

          <Text style={styles.fieldLabel}>Bill name</Text>
          <TextInput
            value={billName}
            onChangeText={setBillName}
            placeholder="Rent, phone, utilities"
            placeholderTextColor="#667085"
            style={styles.input}
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
            style={styles.dateButton}
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
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setShowDatePicker(false)}
                  style={styles.dateDoneButton}
                >
                  <Text style={styles.dateDoneText}>Done</Text>
                </Pressable>
              )}
            </View>
          )}

          {billError !== "" && (
            <Text style={styles.errorText}>{billError}</Text>
          )}

          <Pressable onPress={addBill} style={styles.button}>
            <Text style={styles.buttonText}>Add bill</Text>
          </Pressable>
        </View>
        <PlanActions />
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  scrollContent: {
    padding: 24,
    paddingTop: 80,
    paddingBottom: 120,
  },
  title: {
    color: "#111111",
    fontSize: 32,
    fontWeight: "bold",
  },
  description: {
    color: "#555555",
    marginTop: 8,
    fontSize: 16,
  },
  label: {
    marginTop: 32,
    marginBottom: 8,
    color: "#111111",
  },
  input: {
    borderWidth: 1,
    borderColor: "#B8C0BD",
    borderRadius: 10,
    padding: 12,
    fontSize: 18,
    color: "#111111",
    backgroundColor: "#FFFFFF",
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  errorText: {
    color: "#B42318",
    marginTop: 6,
  },
  button: {
    marginTop: 24,
    backgroundColor: "#167D5A",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
  },
  billItem: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#F4F4F4",
    borderRadius: 8,
  },
  billName: {
    color: "#111111",
    fontSize: 16,
    fontWeight: "600",
  },
  billAmount: {
    color: "#344054",
    fontSize: 16,
    marginTop: 4,
  },
  billDate: {
    color: "#667085",
    fontSize: 14,
    marginTop: 2,
  },
  billCard: {
    marginTop: 28,
    padding: 18,
    borderWidth: 1,
    borderColor: "#D8E3DE",
    borderRadius: 16,
    backgroundColor: "#F4F8F6",
  },
  sectionTitle: {
    color: "#183D30",
    fontSize: 20,
    fontWeight: "700",
  },
  sectionHint: {
    color: "#52665E",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 8,
  },
  fieldLabel: {
    color: "#344054",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 14,
    marginBottom: 6,
  },
  dateButton: {
    minHeight: 48,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#B8C0BD",
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
  },
  dateText: {
    color: "#111111",
    fontSize: 16,
  },
  datePlaceholder: {
    color: "#667085",
    fontSize: 16,
  },
  dateDoneButton: {
    alignSelf: "flex-end",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  dateDoneText: {
    color: "#167D5A",
    fontSize: 16,
    fontWeight: "700",
  },
  datePickerPanel: {
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
});
