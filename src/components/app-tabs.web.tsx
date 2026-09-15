import { TabList, Tabs, TabSlot, TabTrigger, type TabTriggerSlotProps } from "expo-router/ui";
import { Pressable, StyleSheet, Text } from "react-native";
import { palette } from "@/constants/design";

function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  return (
    <Pressable {...props} style={({ pressed }) => [styles.tab,
    isFocused && styles.selected, pressed && styles.pressed]}>
      <Text style={[styles.label, isFocused && styles.selectedLabel]}>{children}</Text>
    </Pressable>
  );
}

export default function AppTabs() {
  return (
    <Tabs>
      <TabList style={styles.navigation}>
        <Text style={styles.brand}>Safe to Spend</Text>
        <TabTrigger name="home" href="/" asChild><TabButton>Home</TabButton></TabTrigger>
        <TabTrigger name="plan" href="/plan" asChild><TabButton>Plan</TabButton></TabTrigger>
      </TabList>
      <TabSlot style={styles.content} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  navigation: {
    flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8,
    padding: 12, backgroundColor: palette.surface, borderBottomWidth: 1, borderBottomColor: palette.border
  },
  brand: { color: palette.accent, fontWeight: "700", fontSize: 16, marginRight: "auto" },
  tab: { padding: 14, minHeight: 48, borderRadius: 12 },
  label: { color: palette.muted, fontSize: 14 },
  selected: { backgroundColor: palette.soft },
  selectedLabel: { color: palette.accent, fontWeight: "700" },
  pressed: { opacity: 0.6 },
  content: { flex: 1 },
});
