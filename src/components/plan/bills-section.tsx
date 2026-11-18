import { CalendarDateField } from "@/components/calendar-date-field";
import { AppButton } from "@/components/app-button";
import { CurrencyInput } from "@/components/currency-input";
import { palette, ui } from "@/constants/design";
import { usePlan } from "@/context/plan-context";
import { billRepeats, isValidBill, markBillPaid, nextBillDate, setBillRepeat, updateBillTemplate, type BillRepeat } from "@/lib/bills";
import { formatCurrency, formatBillDate, toDateOnly } from "@/lib/format";
import type { Bill } from "@/types/bill";
import { useRef, useState } from "react";
import { Keyboard, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

type Editor = { mode: "add" | "current" | "future"; bill?: Bill };
const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const repeatLabel = (value: BillRepeat) => billRepeats.find((option) => option.value === value)!.label;
const localDate = (value: string) => { const [y, m, d] = value.split("-").map(Number); return new Date(y, m - 1, d); };

export function BillsSection() {
  const { billItems, setBillItems, saveState, supportsRecurringBills } = usePlan();
  const [editor, setEditor] = useState<Editor | null>(null);
  const [managedId, setManagedId] = useState<string | null>(null);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const ready = saveState === "saved";
  const today = toDateOnly(new Date());
  const { billsReserved: billsTotal } = usePlan();

  function openEditor(value: Editor) {
    Keyboard.dismiss(); setNotice(""); setError(""); setEditor(value);
  }

  function pay(bill: Bill) {
    if (!ready) return;
    // Validate advancement before entering React's state updater.
    try {
      if (bill.recurrence) nextBillDate(bill.recurrence.nextDueDate, bill.recurrence.frequency, bill.recurrence.anchorDate);
    } catch {
      setError("Update this bill’s future schedule before marking it paid."); return;
    }
    const nextId = makeId();
    setBillItems((current) => markBillPaid(current, bill.id, nextId));
    setManagedId(null); setRemoveId(null); setError("");
    setNotice(bill.recurrence ? `Marked paid. Next payment: ${formatBillDate(bill.recurrence.nextDueDate)}.` : "Marked paid. Bill removed from upcoming bills.");
  }

  if (editor) return <BillEditor key={`${editor.mode}-${editor.bill?.id ?? "new"}`} editor={editor}
    ready={ready} supportsRecurringBills={supportsRecurringBills} onCancel={() => setEditor(null)}
    onSave={(bill) => {
      setBillItems((current) => editor.mode === "add" ? [...current, bill]
        : current.map((item) => item.id === bill.id ? bill : item));
      setEditor(null); setManagedId(null);
      setNotice(editor.mode === "add" ? "Bill added." : editor.mode === "future" ? "Future bills updated." : "Bill updated.");
    }} />;

  return <>
    <Text accessibilityRole="header" style={ui.title}>Upcoming bills</Text>
    <View style={styles.summary}>
      <Text style={ui.label}>Set aside for bills</Text>
      <Text style={styles.total}>{formatCurrency(billsTotal)}</Text>
      <Text style={ui.body}>Reserves overdue bills and repeated payments due before your next payday. Marking paid won’t change your balance.</Text>
    </View>
    {!!notice && <Text accessibilityLiveRegion="polite" style={ui.body}>{notice}</Text>}
    {!!error && <Text accessibilityRole="alert" style={ui.error}>{error}</Text>}
    {billItems.length === 0 && <View style={ui.card}>
      <Text style={ui.sectionTitle}>No upcoming bills</Text>
      <Text style={ui.body}>Add a bill once. Set it to repeat if it comes around again.</Text>
    </View>}
    {[...billItems].sort((a, b) => a.dueDate.localeCompare(b.dueDate)).map((bill) => <View key={bill.id}
      style={ui.card} accessibilityLabel={`Bill: ${bill.name}`}>
      <View style={styles.heading}>
        <Text style={styles.name}>{bill.name}</Text>
        <Text style={styles.money}>{formatCurrency(bill.amount)}</Text>
      </View>
      <View style={styles.meta}>
        <Text style={[styles.date, bill.dueDate < today && styles.overdue]}>{bill.dueDate < today
          ? `Overdue · ${formatBillDate(bill.dueDate)}` : bill.dueDate === today ? "Due today" : `Due ${formatBillDate(bill.dueDate)}`}</Text>
        {bill.recurrence && <Text style={styles.repeat}>↻ {repeatLabel(bill.recurrence.frequency)}</Text>}
      </View>
      <View style={styles.actions}>
        <View style={styles.action}><AppButton title="Mark paid" variant="secondary" disabled={!ready}
          onPress={() => pay(bill)} /></View>
        <AppButton title={managedId === bill.id ? "Done" : "Manage"} variant="text"
          onPress={() => { setManagedId(managedId === bill.id ? null : bill.id); setRemoveId(null); }} />
      </View>
      {managedId === bill.id && <View style={styles.management}>
        {bill.recurrence && <Text style={ui.body}>Next after payment: {formatBillDate(bill.recurrence.nextDueDate)} · {formatCurrency(bill.recurrence.amount)}</Text>}
        <AppButton title="Edit this bill" variant="text" disabled={!ready} onPress={() => openEditor({ mode: "current", bill })} />
        {bill.recurrence && <>
          <AppButton title="Edit future bills" variant="text" disabled={!ready || !supportsRecurringBills}
            onPress={() => openEditor({ mode: "future", bill })} />
          <AppButton title="Stop repeating" variant="text" disabled={!ready} onPress={() => {
            setBillItems((current) => current.map((item) => item.id === bill.id ? setBillRepeat(item, "never") : item));
            setNotice("Repeating stopped. This unpaid bill stays until you mark it paid or remove it.");
            setManagedId(null);
          }} />
        </>}
        {removeId === bill.id ? <>
          <Text style={ui.body}>{bill.recurrence ? "Remove this bill and stop its repeats?" : "Remove this upcoming bill?"}</Text>
          <AppButton title="Confirm removal" variant="secondary" disabled={!ready} onPress={() => {
            setBillItems((current) => current.filter((item) => item.id !== bill.id));
            setRemoveId(null); setManagedId(null); setNotice("Bill removed.");
          }} />
          <AppButton title="Keep bill" variant="text" onPress={() => setRemoveId(null)} />
        </> : <AppButton title="Remove bill" variant="text" disabled={!ready} onPress={() => setRemoveId(bill.id)} />}
      </View>}
    </View>)}
    <AppButton title="Add bill" disabled={!ready} onPress={() => openEditor({ mode: "add" })} />
  </>;
}

function BillEditor({ editor, ready, supportsRecurringBills, onSave, onCancel }: {
  editor: Editor; ready: boolean; supportsRecurringBills: boolean;
  onSave: (bill: Bill) => void; onCancel: () => void;
}) {
  const { mode, bill } = editor;
  const future = mode === "future";
  const template = future ? bill?.recurrence : undefined;
  const [name, setName] = useState(template?.name ?? bill?.name ?? "");
  const [amount, setAmount] = useState(String(template?.amount ?? bill?.amount ?? ""));
  const [date, setDate] = useState<Date | null>(template ? localDate(template.nextDueDate) : bill ? localDate(bill.dueDate) : null);
  const [repeat, setRepeat] = useState<BillRepeat>(template?.frequency ?? bill?.recurrence?.frequency ?? "never");
  const [repeatOpen, setRepeatOpen] = useState(false);
  const [repeatFocused, setRepeatFocused] = useState(false);
  const [error, setError] = useState("");
  const submitted = useRef(false);
  const today = localDate(toDateOnly(new Date()));
  const minimum = future && bill ? localDate(bill.dueDate) : mode === "add" ? today : undefined;
  if (future && minimum) minimum.setDate(minimum.getDate() + 1);
  const showRepeat = mode === "add" || future || !bill?.recurrence;

  function submit() {
    if (submitted.current || !ready) return;
    if (!name.trim() || !amount.trim()) { setError("Enter a bill name and amount."); return; }
    const enteredAmount = Number(amount);
    if (!Number.isFinite(enteredAmount) || enteredAmount < 0 || enteredAmount > 1e12) { setError("Enter a valid bill amount."); return; }
    const value = Math.round(enteredAmount * 100) / 100;
    if (!date) { setError("Choose a due date."); return; }
    const dueDate = toDateOnly(date);
    if (mode === "add" && dueDate < toDateOnly(today)) { setError("Choose today or a future due date."); return; }
    if (repeat !== "never" && !supportsRecurringBills) { setError("Recurring bills aren’t available yet."); return; }
    try {
      let updated: Bill;
      if (future && bill?.recurrence && repeat !== "never") {
        if (dueDate <= bill.dueDate) { setError("The next payment must be after this bill’s due date."); return; }
        updated = updateBillTemplate(bill, { name: name.trim(), amount: value, frequency: repeat, nextDueDate: dueDate });
        nextBillDate(dueDate, repeat); // Ensure this schedule can advance.
      } else {
        updated = { ...(bill ?? { id: makeId() }), name: name.trim(), amount: value, dueDate };
        if (bill?.recurrence && mode === "current") {
          if (dueDate >= bill.recurrence.nextDueDate) {
            setError(`This payment must be before the next repeat on ${formatBillDate(bill.recurrence.nextDueDate)}.`); return;
          }
        } else updated = setBillRepeat(updated, repeat);
      }
      if (!isValidBill(updated)) { setError("Check the bill and repeat dates."); return; }
      submitted.current = true; Keyboard.dismiss(); onSave(updated);
    } catch { setError("Choose a valid due date that can repeat."); }
  }

  return <>
    <Text accessibilityRole="header" style={ui.title}>{mode === "add" ? "Add a bill" : future ? "Edit future bills" : "Edit this bill"}</Text>
    {mode === "current" && bill?.recurrence && <Text style={ui.body}>These changes apply to this payment only.</Text>}
    {future && <Text style={ui.body}>The current payment stays the same. These details start with the next payment.</Text>}
    <View style={ui.card}>
      <Text style={styles.fieldLabel}>Bill name</Text>
      <TextInput accessibilityLabel="Bill name" value={name} onChangeText={setName} maxLength={120}
        placeholder="Rent, phone, utilities" placeholderTextColor={palette.muted} style={ui.input} returnKeyType="done" />
      <Text style={styles.fieldLabel}>Amount</Text>
      <CurrencyInput accessibilityLabel="Bill amount" value={amount} onChangeText={setAmount} />
      <Text style={styles.fieldLabel}>{future ? "Next due date" : "Due date"}</Text>
      <CalendarDateField value={date} onChange={setDate} accessibilityLabel="Choose a due date"
        placeholder="Choose a due date" minimumDate={minimum} initialDate={minimum ?? today} />
      {showRepeat && <>
        <Text style={styles.fieldLabel}>Repeats</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`Repeats: ${repeatLabel(repeat)}`}
          aria-expanded={repeatOpen} aria-controls="bill-repeat-options" aria-disabled={!supportsRecurringBills}
          disabled={!supportsRecurringBills} onFocus={() => setRepeatFocused(true)} onBlur={() => setRepeatFocused(false)}
          onPress={() => { Keyboard.dismiss(); setRepeatOpen(!repeatOpen); }}
          style={[ui.input, styles.repeatField, (repeatOpen || repeatFocused) && styles.repeatFieldFocused,
            !supportsRecurringBills && styles.disabledField]}>
          <Text style={styles.repeatValue}>{repeatLabel(repeat)}</Text>
          <Text accessible={false} style={[styles.chevron, repeatOpen && styles.chevronOpen]}>⌄</Text>
        </Pressable>
        {!supportsRecurringBills && <Text style={ui.body}>Recurring bills aren’t available yet. You can still add a one-time bill.</Text>}
        {repeatOpen && <View nativeID="bill-repeat-options" role="radiogroup" aria-label="Bill repeat frequency" style={styles.repeatOptions}>
          {billRepeats.filter((option) => !future || option.value !== "never").map((option) => <Pressable
            key={option.value} role="radio" aria-checked={repeat === option.value}
            onPress={() => { setRepeat(option.value); setRepeatOpen(false); }}
            style={({ pressed }) => [styles.repeatOption, repeat === option.value && styles.selectedOption, pressed && styles.pressed]}>
            <Text style={styles.optionText}>{option.label}</Text>
            {repeat === option.value && <Text style={styles.optionText}>✓</Text>}
          </Pressable>)}
        </View>}
      </>}
      {!!error && <Text accessibilityRole="alert" style={ui.error}>{error}</Text>}
      <AppButton title={mode === "add" ? "Add bill" : "Save changes"} disabled={!ready} onPress={submit} />
      <AppButton title="Cancel" variant="text" onPress={onCancel} />
    </View>
  </>;
}

const styles = StyleSheet.create({
  summary: { backgroundColor: palette.soft, padding: 20, borderRadius: 16, gap: 8 },
  total: { ...ui.money, fontSize: 28 },
  heading: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12 },
  name: { color: palette.text, fontSize: 17, fontWeight: "600", flexShrink: 1 },
  money: { ...ui.money, fontSize: 17 },
  meta: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
  date: { color: palette.muted, fontSize: 13 },
  overdue: { color: palette.danger },
  repeat: { color: palette.accent, backgroundColor: palette.soft, paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 12, fontSize: 12, fontWeight: "600", overflow: "hidden" },
  actions: { flexDirection: "row", alignItems: "center", gap: 8 },
  action: { flex: 1 },
  management: { borderTopWidth: 1, borderTopColor: palette.border, paddingTop: 12, gap: 4 },
  fieldLabel: { ...ui.label, marginBottom: -8 },
  repeatField: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12,
    borderWidth: 2, paddingVertical: 10 },
  repeatFieldFocused: { borderColor: palette.accent },
  repeatValue: { color: palette.text, fontSize: 16, flex: 1 },
  chevron: { color: palette.muted, fontSize: 20, lineHeight: 22 },
  chevronOpen: { transform: [{ rotate: "180deg" }] },
  disabledField: { opacity: 0.6 },
  repeatOptions: { borderWidth: 1, borderColor: palette.border, borderRadius: 12, overflow: "hidden" },
  repeatOption: { minHeight: 48, paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", justifyContent: "space-between" },
  selectedOption: { backgroundColor: palette.soft },
  optionText: { color: palette.text, fontSize: 15 },
  pressed: { opacity: 0.6 },
});
