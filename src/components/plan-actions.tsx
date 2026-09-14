import { useAuth } from "@/context/auth-context";
import { usePlan } from "@/context/plan-context";
import { useState } from "react";
import { Alert, Keyboard, Pressable, Text, View } from "react-native";

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
      <Text accessibilityLiveRegion="polite" style={{ color: "#52665E" }}>
        {status}
      </Text>
      <Pressable
        accessibilityRole="button"
        disabled={saving || leaving}
        onPress={() => {
          Keyboard.dismiss();
          void save();
        }}
        style={{
          backgroundColor: "#167D5A",
          padding: 14,
          borderRadius: 8,
          alignItems: "center",
          opacity: saving || leaving ? 0.5 : 1,
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "600" }}>
          {saving ? "Saving…" : "Save plan"}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        disabled={saving || leaving}
        style={{ padding: 12, alignItems: "center" }}
        onPress={() =>
          Alert.alert("Sign out?", "Any unsaved changes will be discarded.", [
            { text: "Cancel", style: "cancel" },
            { text: "Sign out", onPress: () => void leave() },
          ])
        }
      >
        <Text style={{ color: "#126247" }}>
          {leaving ? "Signing out…" : "Sign out"}
        </Text>
      </Pressable>
    </View>
  );
}
