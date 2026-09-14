import { Bill } from "@/types/bill";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

export default function HomeScreen() {
  const [balance, setBalance] = useState("");
  const [savingsGoal, setSavingsGoal] = useState("");
  const [safeToSpend, setSafeToSpend] = useState<number | null>(null);
  const [error, setError] = useState("");

  const [billName, setBillName] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [billDueDate, setBillDueDate] = useState("");
  const [billItems, setBillItems] = useState<Bill[]>([]);
  const [billError, setBillError] = useState("");

  const billsTotal = billItems.reduce((total, bill) => total + bill.amount, 0);

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
    setSafeToSpend(null);
    setBillName("");
    setBillAmount("");
    setBillDueDate("");
    setBillError("");
  };

  const calculateSafeToSpend = () => {
    if (balance.trim() === "") {
      setError("Enter your current balance.");
      setSafeToSpend(null);
      return;
    }

    setError("");

    const parsedBalance = Number(balance);
    const parsedSavings = savingsGoal.trim() === "" ? 0 : Number(savingsGoal);

    if (![parsedBalance, parsedSavings].every(Number.isFinite)) {
      setError("Enter valid dollar amounts.");
      setSafeToSpend(null);
      return;
    }

    if (parsedSavings < 0) {
      setError("Savings cannot be negative.");
      setSafeToSpend(null);
      return;
    }

    const safe = parsedBalance - billsTotal - parsedSavings;
    setSafeToSpend(safe);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Safe to Spend</Text>

      <Text style={styles.label}>Current Balance</Text>
      <TextInput
        value={balance.toString()}
        onChangeText={(text) => {
          setBalance(text);
          setSafeToSpend(null);
          setError("");
        }}
        keyboardType="decimal-pad"
        placeholder="0.00"
        style={styles.input}
      ></TextInput>

      <Text style={styles.label}>Add an upcoming bill</Text>
      <TextInput
        value={billName}
        onChangeText={setBillName}
        placeholder="Bill name"
        style={styles.input}
      />

      <TextInput
        value={billAmount}
        onChangeText={setBillAmount}
        keyboardType="decimal-pad"
        placeholder="Amount"
        style={styles.input}
      />

      <TextInput
        value={billDueDate}
        onChangeText={setBillDueDate}
        placeholder="Due date"
        style={styles.input}
      />

      {billError !== "" && <Text style={styles.errorText}>{billError}</Text>}

      <Pressable onPress={addBill} style={styles.button}>
        <Text style={styles.buttonText}>Add bill</Text>
      </Pressable>

      <Text style={styles.label}>
        Upcoming bills total: ${billsTotal.toFixed(2)}
      </Text>

      {billItems.map((bill) => (
        <View key={bill.id} style={styles.billItem}>
          <Text>{bill.name}</Text>
          <Text>${bill.amount.toFixed(2)}</Text>
          {bill.dueDate !== "" && <Text>Due {bill.dueDate}</Text>}
        </View>
      ))}

      <Text style={styles.label}>Savings Goal</Text>
      <TextInput
        value={savingsGoal}
        onChangeText={(text) => {
          setSavingsGoal(text);
          setSafeToSpend(null);
          setError("");
        }}
        keyboardType="decimal-pad"
        placeholder="0.00"
        style={styles.input}
      ></TextInput>

      {error !== "" && <Text style={styles.errorText}>{error}</Text>}

      <Pressable
        onPress={calculateSafeToSpend}
        style={({ pressed }) => [
          styles.button,
          pressed && styles.buttonPressed,
        ]}
      >
        <Text style={styles.buttonText}>Calculate safe to spend.</Text>
      </Pressable>

      {safeToSpend != null && (
        <View
          style={[
            styles.resultCard,
            safeToSpend < 0 && styles.resultCardWarning,
          ]}
        >
          <Text style={styles.resultLabel}>
            {safeToSpend >= 0 ? "Safe To Spend" : "Over your safe amount"}
          </Text>

          <Text style={styles.resultAmount}>
            ${Math.abs(safeToSpend).toFixed(2)}
          </Text>

          <Text style={styles.resultMessage}>
            {safeToSpend >= 0
              ? "Your upcoming bills and savings are protected."
              : "Your bills and savings exceed your current balance."}
          </Text>
        </View>
      )}
    </View>
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
    fontSize: 32,
    fontWeight: "bold",
    color: "#111111",
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
  button: {
    marginTop: 24,
    backgroundColor: "#167D5A",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonPressed: {
    opacity: 0.75,
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
  resultCard: {
    marginTop: 24,
    padding: 20,
    borderRadius: 12,
    backgroundColor: "#E8F5EF",
    alignItems: "center",
  },
  resultCardWarning: {
    backgroundColor: "#FDECEC",
  },
  resultLabel: {
    color: "#444444",
    fontSize: 14,
  },
  resultAmount: {
    color: "#111111",
    fontSize: 36,
    fontWeight: "bold",
    marginVertical: 6,
  },
  resultMessage: {
    color: "#555555",
    textAlign: "center",
  },
  billItem: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#F4F4F4",
    borderRadius: 8,
  },
});
