import { CurrencyInput } from "@/components/currency-input";
import { PlanActions } from "@/components/plan-actions";
import { usePlan } from "@/context/plan-context";
import { useEffect, useState } from "react";
import {
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function HomeScreen() {
  const { balance, setBalance, savingsGoal, billItems } = usePlan();

  const [safeToSpend, setSafeToSpend] = useState<number | null>(null);
  const [error, setError] = useState("");

  const billsTotal = billItems.reduce((total, bill) => total + bill.amount, 0);

  useEffect(() => {
    setSafeToSpend(null);
  }, [balance, savingsGoal, billItems]);

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
    <ScrollView
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
    >
      <Pressable
        style={styles.container}
        onPress={Keyboard.dismiss}
        accessible={false}
      >
        <Text style={styles.title}>Safe to Spend</Text>

        <Text style={styles.label}>Current Balance</Text>
        <CurrencyInput
          accessibilityLabel="Current balance"
          value={balance}
          onChangeText={(text) => {
            setBalance(text);
            setSafeToSpend(null);
            setError("");
          }}
        />

        <Text style={styles.label}>
          Bills protected: ${billsTotal.toFixed(2)}
        </Text>

        <Text style={styles.label}>
          Savings protected: ${(Number(savingsGoal) || 0).toFixed(2)}
        </Text>

        {error !== "" && <Text style={styles.errorText}>{error}</Text>}

        <Pressable
          onPress={calculateSafeToSpend}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.buttonText}>Calculate safe to spend</Text>
        </Pressable>

        {safeToSpend !== null && (
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
        <PlanActions />
      </Pressable>
    </ScrollView>
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
});
