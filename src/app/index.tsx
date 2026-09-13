import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

export default function HomeScreen() {
  const [balance, setBalance] = useState("");
  const [bills, setBills] = useState("");
  const [savingsGoal, setSavingsGoal] = useState("");
  const [safeToSpend, setSafeToSpend] = useState<number | null>(null);

  const calculateSafeToSpend = () => {
    const safe =
      (parseFloat(balance) || 0) -
      (parseFloat(bills) || 0) -
      (parseFloat(savingsGoal) || 0);
    setSafeToSpend(safe);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Safe to Spend</Text>

      <Text style={styles.label}>Current Balance</Text>
      <TextInput
        value={balance.toString()}
        onChangeText={setBalance}
        keyboardType="decimal-pad"
        placeholder="0.00"
        style={styles.input}
      ></TextInput>

      <Text style={styles.label}>Upcoming Bills</Text>
      <TextInput
        value={bills}
        onChangeText={setBills}
        keyboardType="decimal-pad"
        placeholder="0.00"
        style={styles.input}
      ></TextInput>

      <Text style={styles.label}>Savings Goal</Text>
      <TextInput
        value={savingsGoal}
        onChangeText={setSavingsGoal}
        keyboardType="decimal-pad"
        placeholder="0.00"
        style={styles.input}
      ></TextInput>

      <Pressable
        onPress={calculateSafeToSpend}
        style={({ pressed }) => [
          styles.button,
          pressed && styles.buttonPressed,
        ]}
      >
        <Text style={styles.buttonText}>Continue</Text>
      </Pressable>

      {safeToSpend != null && (
        <Text>You can safely spend ${safeToSpend.toFixed(2)}</Text>
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
});
