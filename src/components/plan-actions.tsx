import { AppButton } from "@/components/app-button";
import { ui } from "@/constants/design";
import { useAuth } from "@/context/auth-context";
import { usePlan } from "@/context/plan-context";
import { useState } from "react";
import { Text, View } from "react-native";

export function PlanActions() {
  const { saveState } = usePlan();
  const { signOut } = useAuth();
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState("");

  async function leave() {
    setLeaving(true);
    setError("");
    try {
      await signOut();
    } catch {
      setError("Unable to sign out. Please try again.");
      setLeaving(false);
    }
  }

  return (
    <View>
      <AppButton
        title={leaving ? "Signing out…" : "Sign out"}
        variant="text"
        disabled={saveState !== "saved" || leaving}
        onPress={() => void leave()}
      />
      {saveState !== "saved" && <Text style={ui.body}>Sign out is available after your changes are saved.</Text>}
      {!!error && <Text accessibilityRole="alert" style={ui.error}>{error}</Text>}
    </View>
  );
}
