import { palette } from "@/constants/design";
import { useEffect } from "react";
import { AccessibilityInfo, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function Snackbar({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  const insets = useSafeAreaInsets();
  useEffect(() => {
    if (Platform.OS === "ios") AccessibilityInfo.announceForAccessibility(message);
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  return <View pointerEvents="box-none" style={[styles.position, { bottom: Math.max(insets.bottom, 16) }]}>
    <View style={styles.snackbar}>
      <Text accessible={false} style={styles.check}>✓</Text>
      <Text accessibilityLiveRegion="polite" role="status" style={styles.message}>{message}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Dismiss confirmation" onPress={onDismiss}
        style={({ pressed }) => [styles.dismiss, pressed && styles.pressed]}>
        <Text accessible={false} style={styles.close}>×</Text>
      </Pressable>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  position: { position: "absolute", left: 16, right: 16, alignItems: "center" },
  snackbar: { width: "100%", maxWidth: 520, flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: palette.text, borderRadius: 16, paddingLeft: 16, paddingRight: 4, paddingVertical: 4 },
  check: { color: "#8EE0B8", fontSize: 19, fontWeight: "700" },
  message: { color: palette.surface, fontSize: 14, lineHeight: 20, flex: 1 },
  dismiss: { minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: 12 },
  pressed: { opacity: 0.6 },
  close: { color: palette.surface, fontSize: 24 },
});
