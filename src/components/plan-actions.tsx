import { AppButton } from "@/components/app-button";
import { ui } from "@/constants/design";
import { useAuth } from "@/context/auth-context";
import { usePlan } from "@/context/plan-context";
import { useState } from "react";
import { Alert, Keyboard, Text, View } from "react-native";

export function PlanActions() {
  const { save, saving, status } = usePlan();
  const { signOut } = useAuth();
  const [leaving, setLeaving] = useState(false);
  async function leave() {
    setLeaving(true);
    try {
      await signOut();
    } catch {
      Alert.alert("Unable to sign out", "Please try again.");
      setLeaving(false);
    }
  }
  return (
    <View style={{ marginTop: 20, gap: 10 }}>
      <Text accessibilityLiveRegion="polite" style={ui.body}>
        {status}
      </Text>
      <AppButton title={saving ? "Saving…" : "Save plan"} disabled={saving || leaving}
        onPress={() => { Keyboard.dismiss(); void save(); }} />
      <AppButton title={leaving ? "Signing out…" : "Sign out"} variant="text" disabled={saving || leaving}
        onPress={() => Alert.alert("Sign out?", "Any unsaved changes will be discarded.", [
          { text: "Cancel", style: "cancel" },
          { text: "Sign out", onPress: () => void leave() },
        ])} />
    </View>
  );
}
