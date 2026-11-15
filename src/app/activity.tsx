import { AppButton } from "@/components/app-button";
import { SaveStatus } from "@/components/plan/save-status";
import { Screen } from "@/components/screen";
import { palette, ui } from "@/constants/design";
import { usePlan } from "@/context/plan-context";
import { formatCurrency } from "@/lib/format";
import type { ActivityEntry } from "@/lib/plan";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

const activityColors = {
  income: palette.accent,
  incomeBackground: palette.soft,
  purchase: palette.text,
  purchaseBackground: "#EDF1EF",
  checkIn: "#6956A4",
  checkInBackground: "#EEEAF8",
};

export default function ActivityScreen() {
  const { purchases, balance, balanceUpdatedAt, saveState } = usePlan();
  const [visibleCount, setVisibleCount] = useState(20);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const today = new Date().toDateString();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const groups: { day: string; label: string; entries: ActivityEntry[] }[] = [];
  for (const entry of purchases.slice(0, visibleCount)) {
    const date = new Date(entry.createdAt);
    const day = date.toDateString();
    let group = groups[groups.length - 1];
    if (!group || group.day !== day) {
      group = { day, label: day === today ? "Today" : day === yesterday.toDateString() ? "Yesterday"
        : date.toLocaleDateString(undefined, { month: "short", day: "numeric",
          ...(date.getFullYear() !== new Date().getFullYear() ? { year: "numeric" } : {}) }), entries: [] };
      groups.push(group);
    }
    group.entries.push(entry);
  }

  return <Screen>
    <View style={styles.header}>
      <View style={styles.titleBlock}>
        <Text style={styles.eyebrow}>THE MONEY TRAIL</Text>
        <Text accessibilityRole="header" style={styles.title}>Activity</Text>
      </View>
      <View style={styles.balanceBlock}>
        <Text style={styles.caption}>Balance now</Text>
        <Text style={styles.balance}>{balanceUpdatedAt ? formatCurrency(Number(balance)) : "—"}</Text>
      </View>
    </View>
    {groups.length === 0 ? <View style={styles.empty}>
      <View style={[styles.icon, styles.checkInIcon]}><Text style={styles.checkInSymbol}>↻</Text></View>
      <Text style={styles.emptyTitle}>A fresh start.</Text>
      <Text style={styles.emptyBody}>Check in with your balance or log a purchase on Home. Your money trail starts here.</Text>
    </View> : groups.map((group, groupIndex) => <View key={`${group.day}-${groupIndex}`} style={styles.group}>
      <Text accessibilityRole="header" style={styles.day}>{group.label}</Text>
      <View style={styles.ledger}>
        {group.entries.map((entry, index) => {
          const checkIn = entry.kind === "balance_check_in";
          const income = entry.kind === "income";
          const starting = checkIn && entry.balanceBefore === null;
          const label = checkIn ? (starting ? "Starting balance" : "Balance check-in") : income ? "Income" : "Purchase";
          const change = checkIn || income ? entry.amount : -entry.amount;
          const changeLabel = starting ? formatCurrency(entry.balanceAfter!) : change === 0 ? "No change"
            : `${change > 0 ? "+" : "−"}${formatCurrency(Math.abs(change))}`;
          const time = new Date(entry.createdAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
          const hasDetails = entry.balanceAfter !== undefined && entry.balanceBefore !== undefined;
          const balanceTrail = hasDetails ? `${entry.balanceBefore === null ? "Start" : formatCurrency(entry.balanceBefore!)} → ${formatCurrency(entry.balanceAfter!)}` : "";
          const expanded = expandedId === entry.id;
          return <View key={entry.id}>
            {index > 0 && <View style={styles.divider} />}
            <Pressable accessibilityRole="button" aria-expanded={expanded}
              accessibilityHint={expanded ? "Collapse balance details" : "Show balance details"}
              accessibilityLabel={`${entry.note || label}, ${entry.note ? `${label}, ` : ""}${changeLabel}, ${time}${balanceTrail ? `, balance ${balanceTrail}` : ""}`}
              onFocus={() => setFocusedId(entry.id)} onBlur={() => setFocusedId(null)}
              onPress={() => setExpandedId(expanded ? null : entry.id)}
              style={({ pressed }) => [styles.row, pressed && styles.pressed,
                focusedId === entry.id && styles.focused]}>
              <View style={styles.mainRow}>
                <View style={[styles.icon, checkIn ? styles.checkInIcon : income ? styles.incomeIcon : styles.purchaseIcon]}>
                  <Text accessible={false} style={[styles.symbol, checkIn ? styles.checkInSymbol : income ? styles.incomeText : styles.purchaseText]}>
                    {checkIn ? "↻" : income ? "+" : "−"}
                  </Text>
                </View>
                <View style={styles.rowContent}>
                  <View style={styles.rowHeading}>
                    <Text numberOfLines={1} style={styles.name}>{entry.note || (checkIn ? starting ? "First balance" : "Check-in" : label)}</Text>
                    <Text style={[styles.change, checkIn ? styles.checkInText : income && styles.incomeText]}>{changeLabel}</Text>
                  </View>
                  <View style={styles.rowMeta}>
                    <Text style={styles.caption}>{time}</Text>
                    {!!balanceTrail && <Text style={styles.trail}>{balanceTrail}</Text>}
                  </View>
                </View>
                <Text accessible={false} style={[styles.chevron, expanded && styles.expandedChevron]}>›</Text>
              </View>
              {expanded && <View style={styles.details}>
                <Text style={styles.detailTitle}>{label}</Text>
                {hasDetails ? <>
                  <View style={styles.detailLine}>
                    <Text style={styles.caption}>Balance before</Text>
                    <Text style={styles.detailAmount}>{entry.balanceBefore === null ? "Not set" : formatCurrency(entry.balanceBefore!)}</Text>
                  </View>
                  <View style={styles.detailLine}>
                    <Text style={styles.caption}>Balance after</Text>
                    <Text style={styles.detailAmount}>{formatCurrency(entry.balanceAfter!)}</Text>
                  </View>
                </> : <Text style={styles.detailNote}>Balance details aren’t available for this older entry.</Text>}
                {checkIn && !starting && <Text style={styles.detailNote}>You replaced your balance with this check-in.</Text>}
              </View>}
            </Pressable>
          </View>;
        })}
      </View>
    </View>)}
    {purchases.length > visibleCount && <AppButton title="Show older activity" variant="secondary"
      onPress={() => setVisibleCount((count) => count + 20)} />}
    {saveState !== "saved" && <SaveStatus />}
  </Screen>;
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 16, paddingVertical: 8 },
  titleBlock: { gap: 6 },
  eyebrow: { color: palette.accent, fontSize: 10, fontWeight: "700", letterSpacing: 1.6 },
  title: { color: palette.text, fontSize: 34, fontWeight: "800", letterSpacing: -1.1 },
  balanceBlock: { gap: 4, alignItems: "flex-end", paddingBottom: 3 },
  balance: { ...ui.money, fontSize: 20, letterSpacing: -0.5 },
  group: { gap: 10 },
  day: { color: palette.muted, fontSize: 13, fontWeight: "700", paddingLeft: 4 },
  ledger: { backgroundColor: palette.surface, borderRadius: 20, overflow: "hidden" },
  row: { paddingHorizontal: 14, paddingVertical: 18, borderWidth: 2, borderColor: "transparent", borderRadius: 14 },
  mainRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  icon: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  symbol: { fontSize: 23, fontWeight: "500", lineHeight: 28 },
  checkInSymbol: { color: activityColors.checkIn, fontSize: 25, lineHeight: 30 },
  checkInText: { color: activityColors.checkIn },
  checkInIcon: { backgroundColor: activityColors.checkInBackground },
  incomeIcon: { backgroundColor: activityColors.incomeBackground },
  purchaseIcon: { backgroundColor: activityColors.purchaseBackground },
  incomeText: { color: activityColors.income },
  purchaseText: { color: activityColors.purchase },
  rowContent: { flex: 1, gap: 6, minWidth: 0 },
  rowHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 6 },
  name: { color: palette.text, fontSize: 15, fontWeight: "600", flex: 1 },
  change: { ...ui.money, fontSize: 15, letterSpacing: -0.3 },
  rowMeta: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 4 },
  caption: { color: palette.muted, fontSize: 12, lineHeight: 18 },
  trail: { color: palette.muted, fontSize: 12, lineHeight: 18, fontVariant: ["tabular-nums"] },
  chevron: { color: palette.muted, fontSize: 20 },
  expandedChevron: { transform: [{ rotate: "90deg" }] },
  divider: { height: 1, backgroundColor: palette.background, marginLeft: 64, marginRight: 16 },
  pressed: { backgroundColor: palette.soft },
  focused: { borderColor: palette.accent },
  details: { marginLeft: 48, marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: palette.border, gap: 8 },
  detailTitle: { color: palette.text, fontSize: 12, fontWeight: "600" },
  detailLine: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 8 },
  detailAmount: { ...ui.money, fontSize: 12, lineHeight: 18 },
  detailNote: { color: palette.muted, fontSize: 12, lineHeight: 18 },
  empty: { alignItems: "center", gap: 14, paddingVertical: 48, paddingHorizontal: 20 },
  emptyTitle: { color: palette.text, fontSize: 22, fontWeight: "700", letterSpacing: -0.5 },
  emptyBody: { ...ui.body, textAlign: "center", maxWidth: 260 },
});
