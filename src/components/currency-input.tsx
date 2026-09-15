import { useState } from "react";
import { palette } from "@/constants/design";
import { Keyboard, StyleSheet, Text, TextInput, View } from "react-native";

type CurrencyInputProps = {
  value: string;
  onChangeText: (text: string) => void;
  accessibilityLabel: string;
  placeholder?: string;
  error?: boolean;
  symbol?: "$" | "%";
};

export function CurrencyInput({
  value,
  onChangeText,
  accessibilityLabel,
  placeholder = "0.00",
  error = false,
  symbol = "$",
}: CurrencyInputProps) {
  const [focused, setFocused] = useState(false);
  const formatValue = () => {
    if (value.trim() === "") return;

    const amount = Number(value);
    if (Number.isFinite(amount)) {
      onChangeText(amount.toFixed(2));
    }
  };

  return (
    <View style={[styles.container, focused && { borderColor: palette.accent, borderWidth: 2 }, error && { borderColor: palette.danger }]}>
      <Text style={styles.symbol}>{symbol}</Text>
      <TextInput
        accessibilityLabel={accessibilityLabel}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); formatValue(); }}
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
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderColor: palette.border,
    borderRadius: 12,
    backgroundColor: palette.surface,
    paddingHorizontal: 12,
  },
  symbol: {
    color: palette.muted,
    fontSize: 18,
    fontWeight: "600",
    marginRight: 6,
  },
  input: {
    flex: 1,
    color: palette.text,
    fontSize: 18,
    paddingVertical: 12,
  },
});
