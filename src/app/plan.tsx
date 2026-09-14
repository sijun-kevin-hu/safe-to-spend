import { usePlan } from "@/context/plan-context";
import type { Bill } from "@/types/bill";
import { useState } from "react";
import {
  Keyboard,
  Pressable,
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
  const [billDueDate, setBillDueDate] = useState("");
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
      dueDate: billDueDate.trim(),
    };

    setBillItems((currentBills) => [...currentBills, newBill]);
    setBillName("");
    setBillAmount("");
    setBillDueDate("");
    setBillError("");
  };

  return (
    <Pressable
      style={styles.container}
      onPress={Keyboard.dismiss}
      accessible={false}
    >
      <Text style={styles.title}>Your Plan</Text>
      <Text style={styles.description}>
        Protect money for upcoming bills and savings.
      </Text>

      <Text style={styles.description}>
        Current balance: {balance === "" ? "Not entered" : `$${balance}`}
      </Text>

      <Text style={styles.label}>Savings Goal</Text>
      <TextInput
        value={savingsGoal}
        onChangeText={handleSavingsChange}
        keyboardType="decimal-pad"
        placeholder="0.00"
        style={styles.input}
        returnKeyType="done"
        onSubmitEditing={Keyboard.dismiss}
      />

      {savingsError !== "" && (
        <Text style={styles.errorText}>{savingsError}</Text>
      )}

      {billItems.map((bill) => (
        <View key={bill.id} style={styles.billItem}>
          <Text>{bill.name}</Text>
          <Text>${bill.amount.toFixed(2)}</Text>
          {bill.dueDate !== "" && <Text>Due {bill.dueDate}</Text>}
        </View>
      ))}

      <Text style={styles.label}>Add an upcoming bill</Text>
      <TextInput
        value={billName}
        onChangeText={setBillName}
        placeholder="Bill name"
        style={styles.input}
        returnKeyType="done"
        onSubmitEditing={Keyboard.dismiss}
      />

      <TextInput
        value={billAmount}
        onChangeText={setBillAmount}
        keyboardType="decimal-pad"
        placeholder="Amount"
        style={styles.input}
        returnKeyType="done"
        onSubmitEditing={Keyboard.dismiss}
      />

      <TextInput
        value={billDueDate}
        onChangeText={setBillDueDate}
        placeholder="Due date"
        style={styles.input}
        returnKeyType="done"
        onSubmitEditing={Keyboard.dismiss}
      />

      {billError !== "" && <Text style={styles.errorText}>{billError}</Text>}

      <Pressable onPress={addBill} style={styles.button}>
        <Text style={styles.buttonText}>Add bill</Text>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
    padding: 24,
    paddingTop: 80,
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
    borderColor: "#cccccc",
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    color: "#111111",
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
});
