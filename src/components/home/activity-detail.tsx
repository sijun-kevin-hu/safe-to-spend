import { AppButton } from "@/components/app-button";
import { CurrencyInput } from "@/components/currency-input";
import { SaveStatus } from "@/components/plan/save-status";
import { palette, ui } from "@/constants/design";
import { usePlan } from "@/context/plan-context";
import { formatCurrency } from "@/lib/format";
import type { ActivityEntry } from "@/lib/plan";
import { useEffect, useRef, useState } from "react";
import { Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function ActivityDetail({ entry, onClose, onSaved }: {
  entry: ActivityEntry; onClose: () => void; onSaved: (message: string) => void;
}) {
  const { balance, saveState, validationError, supportsActivityEditing, previewActivity, changeActivity } = usePlan();
  const insets = useSafeAreaInsets();
  const checkIn = entry.kind === "balance_check_in";
  const transfer = entry.kind === "savings_transfer";
  const income = entry.kind === "income";
  const title = checkIn ? (entry.balanceBefore === null ? "Starting balance" : "Balance check-in")
    : transfer ? "Moved to savings" : income ? "Income" : "Purchase";
  const [amount, setAmount] = useState(String(checkIn ? entry.balanceAfter : entry.amount));
  const [note, setNote] = useState(entry.note ?? "");
  const [allocation, setAllocation] = useState(String(entry.savingsAllocated ?? 0));
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState("");
  const started = useRef(false);
  const submitted = useRef(false);
  const busy = !!pending;
  const edit = { amount: Number(amount), note, ...(income && entry.savingsAllocated !== undefined ? { savingsAllocated: Number(allocation) } : {}) };
  let preview: ReturnType<typeof previewActivity> | undefined;
  let previewError = "";
  try {
    if (!deleting && (!amount.trim() || (income && entry.savingsAllocated !== undefined && !allocation.trim()))) throw new Error("Enter an amount.");
    preview = previewActivity(entry.id, deleting ? null : edit);
  } catch (failure) { previewError = failure instanceof Error ? failure.message : "Check the amount."; }
  const changed = deleting || edit.amount !== (checkIn ? entry.balanceAfter : entry.amount)
    || note.trim() !== (entry.note ?? "") || (income && entry.savingsAllocated !== undefined && edit.savingsAllocated !== entry.savingsAllocated);

  useEffect(() => {
    if (!pending) return;
    if (saveState !== "saved") started.current = true;
    else if (started.current) onSaved(pending);
  }, [pending, saveState, onSaved]);

  function close() { if (!busy || saveState === "error") { Keyboard.dismiss(); onClose(); } }
  function submit() {
    if (submitted.current || !preview || !changed || saveState !== "saved") return;
    try {
      changeActivity(entry.id, deleting ? null : edit);
      submitted.current = true;
      Keyboard.dismiss();
      setPending(deleting ? "Activity deleted" : "Activity updated");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Unable to update activity."); }
  }

  return <Modal transparent animationType="slide" visible onRequestClose={close} statusBarTranslucent navigationBarTranslucent>
    <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Pressable accessible={false} style={styles.backdrop} onPress={close} />
      <View accessibilityViewIsModal role="dialog" aria-label={title} style={[styles.sheet, { marginTop: insets.top + 16 }]}>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={ui.sectionTitle}>{deleting ? "Delete activity?" : title}</Text>
          <AppButton title="Close" variant="text" disabled={busy && saveState !== "error"} onPress={close} />
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <Text style={ui.body}>{new Date(entry.createdAt).toLocaleString(undefined, {
            month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
          })}</Text>
          {deleting ? <>
            <Text style={ui.body}>This removes the record and corrects the affected balances. This can’t be undone.</Text>
            {income && entry.savingsSavedAt && <Text style={ui.body}>The linked savings record will also be removed.</Text>}
            {transfer && <Text style={ui.body}>This undoes the recorded move to savings. No money is moved between accounts.</Text>}
          </> : <>
            <View style={styles.field}>
              <Text style={ui.label}>{checkIn ? "Balance at this check-in" : "Amount"}</Text>
              <CurrencyInput accessibilityLabel={checkIn ? "Balance at this check-in" : "Activity amount"}
                value={amount} onChangeText={setAmount} editable={!busy} error={!!previewError} />
            </View>
            <View style={styles.field}>
              <Text style={ui.label}>Description (optional)</Text>
              <TextInput accessibilityLabel="Activity description" value={note} onChangeText={setNote}
                maxLength={120} editable={!busy} style={ui.input} placeholder="Add a description"
                placeholderTextColor={palette.muted} returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />
            </View>
            {income && entry.savingsAllocated !== undefined && <View style={styles.field}>
              <Text style={ui.label}>Set aside for savings</Text>
              <CurrencyInput accessibilityLabel="Set aside for savings" value={allocation} onChangeText={setAllocation} editable={!busy} />
              <Text style={styles.caption}>Keep or correct the amount set aside for this income.</Text>
            </View>}
            {transfer && <Text style={ui.body}>Corrects the recorded savings amount and its linked income. No money is moved between accounts.</Text>}
          </>}
          {!deleting && entry.balanceAfter !== undefined && <Text style={styles.caption}>
            Recorded balance: {entry.balanceBefore == null ? "Not set" : formatCurrency(entry.balanceBefore)} → {formatCurrency(entry.balanceAfter)}
          </Text>}
          {preview && !busy && <View style={styles.preview}>
            <Text style={ui.label}>Balance after this {deleting ? "deletion" : "change"}</Text>
            <Text style={styles.balance}>{formatCurrency(preview.balance)}</Text>
            <Text style={styles.caption}>{preview.balance === Number(balance)
              ? "Your current balance stays the same. Later balance check-ins are kept."
              : "Your safe-to-spend amount will update with your balance."}</Text>
          </View>}
          {!!(error || previewError) && !busy && <Text accessibilityRole="alert" style={ui.error}>{error || previewError}</Text>}
          {!!validationError && <Text style={ui.error}>{validationError}</Text>}
          {!supportsActivityEditing && <Text style={ui.body}>Activity editing isn’t available on this server yet.</Text>}
          {busy ? <><SaveStatus /><Text accessibilityLiveRegion="polite" style={ui.body}>
            {saveState === "error" ? "Your changes are waiting to save. Keep the app open; we’ll retry automatically." : "Saving your changes…"}
          </Text></> : <>
            <AppButton title={deleting ? "Delete activity" : "Save changes"} variant={deleting ? "danger" : "primary"}
              disabled={!preview || !changed || saveState !== "saved" || !!validationError || !supportsActivityEditing} onPress={submit} />
            <AppButton title={deleting ? "Keep activity" : "Delete activity"} variant="text"
              disabled={saveState !== "saved" || !supportsActivityEditing} onPress={() => { Keyboard.dismiss(); setError(""); setDeleting(!deleting); }} />
          </>}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: { maxHeight: "90%", width: "100%", maxWidth: 560, alignSelf: "center", backgroundColor: palette.background,
    borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: "hidden" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8,
    paddingLeft: 20, paddingRight: 4, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: palette.border },
  content: { padding: 20, gap: 20 },
  field: { gap: 4 },
  preview: { backgroundColor: palette.soft, padding: 16, borderRadius: 16, gap: 4 },
  balance: { ...ui.money, fontSize: 28 },
  caption: { ...ui.body, fontSize: 13, lineHeight: 19 },
});
