import { AppButton } from "@/components/app-button";
import { Screen } from "@/components/screen";
import { palette, ui } from "@/constants/design";
import { usePlan } from "@/context/plan-context";
import type { TrackingPreference } from "@/lib/plan";
import { useState, type PropsWithChildren } from "react";
import { StyleSheet, Text, View } from "react-native";

const choices = [
  { value: "purchases", title: "Log purchases & income", description: "Log money in and out. See what’s safe to spend as you go." },
  { value: "balance", title: "Update my balance", description: "Prefer fewer entries? Check in with your current balance instead." },
] as const;

export function TrackingPreferencePicker({ value, onChange }: {
  value: TrackingPreference | null;
  onChange: (value: TrackingPreference) => void;
}) {
  return <View style={styles.choices}>
    {choices.map((choice) => <View key={choice.value} style={[
      styles.choice, value === choice.value && styles.selected,
    ]}>
      {choice.value === "purchases" && <View style={styles.badge}>
        <Text style={styles.badgeText}>Recommended</Text>
      </View>}
      <AppButton title={`${value === choice.value ? "✓ " : ""}${choice.title}`}
        selected={value === choice.value}
        variant={value === choice.value ? "primary" : "secondary"}
        onPress={() => onChange(choice.value)} />
      <Text style={ui.body}>{choice.description}</Text>
    </View>)}
  </View>;
}

export function TrackingOnboarding({ children }: PropsWithChildren) {
  const { trackingPreference, setTrackingPreference } = usePlan();
  const [choice, setChoice] = useState<TrackingPreference>("purchases");
  if (trackingPreference) return children;
  return <Screen>
    <Text style={ui.label}>Welcome to Safe to Spend</Text>
    <Text accessibilityRole="header" style={ui.title}>Keep up with money in and out</Text>
    <TrackingPreferencePicker value={choice} onChange={setChoice} />
    <Text style={ui.body}>Choose your Home view. You can change it in Plan anytime.</Text>
    <AppButton title="Continue" disabled={!choice} onPress={() => {
      if (choice) setTrackingPreference(choice);
    }} />
  </Screen>;
}

const styles = StyleSheet.create({
  choices: { gap: 16 },
  choice: { ...ui.card, borderWidth: 2, borderColor: palette.border, gap: 12 },
  selected: { borderColor: palette.accent },
  badge: { alignSelf: "flex-start", backgroundColor: palette.soft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  badgeText: { color: palette.accent, fontSize: 13, fontWeight: "600" },
});
