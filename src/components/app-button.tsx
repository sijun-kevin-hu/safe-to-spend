import { useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { palette } from "@/constants/design";

type AppButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "text";
};

export function AppButton({ title, onPress, disabled = false, variant = "primary" }: AppButtonProps) {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled }}
      disabled={disabled} onPress={onPress} onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => [styles.button, styles[variant],
      focused && styles.focused, (pressed || disabled) && styles.dimmed]}>
      <Text style={[styles.label, variant === "primary" && styles.primaryLabel]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48, paddingVertical: 14, paddingHorizontal: 20,
    borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "transparent"
  },
  primary: { backgroundColor: palette.accent },
  secondary: { backgroundColor: palette.soft, borderColor: palette.border },
  text: { backgroundColor: "transparent" },
  focused: { borderColor: palette.text },
  dimmed: { opacity: 0.6 },
  label: { color: palette.accent, fontSize: 16, fontWeight: "600", textAlign: "center" },
  primaryLabel: { color: palette.surface },
});
