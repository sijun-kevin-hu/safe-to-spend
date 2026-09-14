import { Keyboard, StyleSheet, Text, TextInput, View } from "react-native";

type CurrencyInputProps = {
  value: string;
  onChangeText: (text: string) => void;
  accessibilityLabel: string;
  placeholder?: string;
};

export function CurrencyInput({
  value,
  onChangeText,
  accessibilityLabel,
  placeholder = "0.00",
}: CurrencyInputProps) {
  const formatValue = () => {
    if (value.trim() === "") return;

    const amount = Number(value);
    if (Number.isFinite(amount)) {
      onChangeText(amount.toFixed(2));
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.symbol}>$</Text>
      <TextInput
        accessibilityLabel={accessibilityLabel}
        value={value}
        onChangeText={onChangeText}
        onBlur={formatValue}
        keyboardType="decimal-pad"
        placeholder={placeholder}
        placeholderTextColor="#667085"
        returnKeyType="done"
        onSubmitEditing={Keyboard.dismiss}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#B8C0BD",
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
  },
  symbol: {
    color: "#344054",
    fontSize: 18,
    fontWeight: "600",
    marginRight: 6,
  },
  input: {
    flex: 1,
    color: "#111111",
    fontSize: 18,
    paddingVertical: 12,
  },
});
