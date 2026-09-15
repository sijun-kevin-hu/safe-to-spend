import { ui } from "@/constants/design";
import { usePlan } from "@/context/plan-context";
import { Text } from "react-native";

const messages = {
  saved: "All changes saved automatically.",
  pending: "Changes waiting to save…",
  saving: "Saving changes…",
  invalid: "Enter valid balance and savings values to save your changes.",
  error: "Changes not saved yet. Retrying automatically. Keep the app open.",
};

export function SaveStatus() {
  const { saveState } = usePlan();
  return (
    <Text accessibilityLiveRegion="polite" style={saveState === "error" || saveState === "invalid" ? ui.error : ui.body}>
      {messages[saveState]}
    </Text>
  );
}
