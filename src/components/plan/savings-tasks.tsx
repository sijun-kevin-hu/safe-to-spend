import { AppButton } from "@/components/app-button";
import { palette, ui } from "@/constants/design";
import { usePlan } from "@/context/plan-context";
import { formatCurrency } from "@/lib/format";
import { useState } from "react";
import { Text, View } from "react-native";

export function SavingsTasks({ compact = false }: { compact?: boolean }) {
  const { savingsTasks, markSavingsSaved, saveState, validationError, supportsSavingsTasks, reminder } = usePlan();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [showSaved, setShowSaved] = useState(false);
  const [error, setError] = useState("");
  const pending = savingsTasks.filter(t => !t.savedAt);
  const saved = savingsTasks.filter(t => t.savedAt);
  if (compact && pending.length === 0) return null;
  return <>
    <Text accessibilityRole="header" style={ui.sectionTitle}>Ready for savings</Text>
    {!pending.length && <Text style={ui.body}>You’re all caught up. Log income to set aside more.</Text>}
    {(compact ? pending.slice(0, 3) : pending).map(task => <View key={task.id} style={[ui.card, { borderLeftWidth: 4, borderLeftColor: palette.accent }]}>
      <Text style={ui.sectionTitle}>Set aside {formatCurrency(task.amount)}</Text>
      <Text style={ui.body}>{task.incomeAmount !== undefined ? `From ${formatCurrency(task.incomeAmount)} income · ${new Date(task.createdAt!).toLocaleDateString(undefined, { month: "short", day: "numeric" })}` : "Previously set aside"}</Text>
      {confirmId === task.id ? <>
        <Text style={ui.body}>Moved {formatCurrency(task.amount)} to another account? Your tracked balance will decrease. Safe-to-spend stays the same.</Text>
        <AppButton title="Yes, moved to savings" disabled={saveState !== "saved" || !!validationError || !supportsSavingsTasks} onPress={() => {
          try { markSavingsSaved(task.id); setConfirmId(null); setError(""); }
          catch (e) { setError(e instanceof Error ? e.message : "Unable to mark as saved."); }
        }} />
        <AppButton title="Cancel" variant="text" onPress={() => { setConfirmId(null); setError(""); }} />
      </> : <AppButton title="Mark as saved" disabled={saveState !== "saved" || !!validationError || !supportsSavingsTasks}
        onPress={() => { setConfirmId(task.id); setError(""); }} />}
    </View>)}
    {compact && pending.length > 3 && <Text style={ui.body}>See all {pending.length} pending cards in Plan → Savings.</Text>}
    {!!error && <Text accessibilityRole="alert" style={ui.error}>{error}</Text>}
    {!compact && <>
      <View style={ui.card}>
        <Text style={ui.label}>A gentle reminder</Text>
        <Text style={ui.body}>{reminder.available ? "Daily at 6 PM while savings are waiting, on this device." : "Savings reminders are available in the iOS and Android app."}</Text>
        {reminder.available && <AppButton title={reminder.enabled ? "Turn off reminders" : "Remind me daily"} variant="secondary" disabled={reminder.busy} onPress={() => { void reminder.toggle(); }} />}
        {!!reminder.error && <Text accessibilityRole="alert" style={ui.error}>{reminder.error}</Text>}
      </View>
      {saved.length > 0 && <AppButton title={`${showSaved ? "Hide" : "Show"} saved (${saved.length})`} variant="text" onPress={() => setShowSaved(!showSaved)} />}
      {showSaved && saved.map(task => <View key={task.id} style={ui.card}>
        <Text style={ui.sectionTitle}>{saveState === "saved" ? `✓ ${formatCurrency(task.amount)} saved` : `${formatCurrency(task.amount)} · Saving…`}</Text>
        <Text style={ui.body}>Moved {new Date(task.savedAt!).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</Text>
      </View>)}
    </>}
  </>;
}
