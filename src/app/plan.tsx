import { TrackingPreferencePicker } from "@/components/tracking-preference";
import { AppButton } from "@/components/app-button";
import { BillsSection } from "@/components/plan/bills-section";
import { SavingsSection } from "@/components/plan/savings-section";
import { SaveStatus } from "@/components/plan/save-status";
import { PlanActions } from "@/components/plan-actions";
import { Screen } from "@/components/screen";
import { palette, ui } from "@/constants/design";
import { usePlan } from "@/context/plan-context";
import { formatCurrency } from "@/lib/format";
import { useEffect, useState } from "react";
import { BackHandler, Keyboard, Pressable, StyleSheet, Text, View } from "react-native";
import { useIsFocused } from "expo-router";

type Section = "overview" | "savings" | "bills" | "tracking";

export default function PlanScreen() {
  const [section, setSection] = useState<Section>("overview");
  const { trackingPreference, setTrackingPreference, savingsReserved, savingsMode, savingsValue, billItems } = usePlan();
  const isFocused = useIsFocused();
  const billsTotal = billItems.reduce((total, bill) => total + bill.amount, 0);

  useEffect(() => {
    if (!isFocused || section === "overview") return;
    const listener = BackHandler.addEventListener("hardwareBackPress", () => {
      setSection("overview");
      return true;
    });
    return () => listener.remove();
  }, [isFocused, section]);

  function openSection(next: Section) {
    Keyboard.dismiss();
    setSection(next);
  }

  return (
    <Screen key={section}>
      {section !== "overview" && <AppButton title="‹ Back to Plan" variant="text" onPress={() => openSection("overview")} />}
      {section === "overview" && <>
        <Text accessibilityRole="header" style={ui.title}>Your plan</Text>
        <Text style={ui.body}>Set aside money for savings and upcoming bills.</Text>
        <PlanCard
          title="Savings"
          amount={Number.isFinite(savingsReserved) ? formatCurrency(savingsReserved) : "—"}
          description={savingsMode === "percentage" ? `${savingsValue || "0"}% of current balance` : "Fixed amount"}
          onPress={() => openSection("savings")}
        />
        <PlanCard
          title="Upcoming bills"
          amount={formatCurrency(billsTotal)}
          description={`${billItems.length} ${billItems.length === 1 ? "bill" : "bills"} · View and add bills`}
          onPress={() => openSection("bills")}
        />
        <PlanCard title="Balance tracking"
          amount={trackingPreference === "purchases" ? "Log purchases" : "Update my balance"}
          description="Change your Home view"
          onPress={() => openSection("tracking")} />
      </>}
      {section === "tracking" && <>
        <Text accessibilityRole="header" style={ui.title}>Balance tracking</Text>
        <Text style={ui.body}>Choose your Home view. You can open the other view anytime.</Text>
        <TrackingPreferencePicker value={trackingPreference} onChange={setTrackingPreference} />
        <Text style={ui.body}>Changing this preference keeps your balance and purchases.</Text>
      </>}
      {section === "savings" && <SavingsSection />}
      {section === "bills" && <BillsSection />}
      <SaveStatus />
      {section === "overview" && <PlanActions />}
    </Screen>
  );
}

function PlanCard({ title, amount, description, onPress }: {
  title: string;
  amount: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Open ${title}`} onPress={onPress}
      style={({ pressed }) => [ui.card, styles.card, pressed && styles.pressed]}>
      <View style={ui.row}>
        <Text style={ui.sectionTitle}>{title}</Text>
        <Text style={styles.chevron}>›</Text>
      </View>
      <Text style={styles.amount}>{amount}</Text>
      <Text style={ui.body}>{description}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: palette.border },
  pressed: { backgroundColor: palette.soft },
  amount: { ...ui.money, fontSize: 30 },
  chevron: { color: palette.accent, fontSize: 28 },
});
