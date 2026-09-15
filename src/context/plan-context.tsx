import { AppButton } from "@/components/app-button";
import { palette, ui } from "@/constants/design";
import { Autosave, type SaveState } from "@/lib/autosave";
import {
  calculateSavingsReserved,
  recordPurchase,
  updateTrackingBalance,
  type TrackingPreference,
  type TrackingState,
  savingsError,
  savingsSetting,
  type PlanInput,
  type SavingsMode,
  type StoredPlan,
} from "@/lib/plan";
import { requestPlan } from "@/lib/plan-api";
import type { Bill } from "@/types/bill";
import {
  createContext, useContext, useEffect, useRef, useState,
  type Dispatch, type PropsWithChildren, type SetStateAction,
} from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useAuth } from "./auth-context";

type PlanContextValue = {
  saveState: SaveState;
  balance: string;
  trackingPreference: TrackingPreference | null;
  setTrackingPreference: Dispatch<SetStateAction<TrackingPreference | null>>;
  balanceUpdatedAt: string | null;
  purchases: TrackingState["purchases"];
  updateBalance: (value: number) => void;
  addPurchase: (amount: number, note?: string) => void;
  savingsMode: SavingsMode;
  savingsValue: string;
  setSavingsValue: Dispatch<SetStateAction<string>>;
  changeSavingsMode: (mode: SavingsMode) => void;
  savingsReserved: number;
  validationError: string;
  billItems: Bill[];
  setBillItems: Dispatch<SetStateAction<Bill[]>>;
};

const PlanContext = createContext<PlanContextValue | undefined>(undefined);

export function PlanProvider({ children }: PropsWithChildren) {
  const { session, signOut } = useAuth();
  const [initialPlan, setInitialPlan] = useState<StoredPlan | null>(null);
  const [loadError, setLoadError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const userId = session!.user.id;

  useEffect(() => {
    let active = true;
    setLoadError("");
    requestPlan(userId).then((plan) => {
      if (active) setInitialPlan(plan);
    }).catch(() => {
      if (active) setLoadError("Unable to load your plan. Check your connection and retry.");
    });
    return () => { active = false; };
  }, [userId, attempt]);

  if (!initialPlan) {
    return (
      <View style={styles.loading}>
        {loadError ? <>
          <Text accessibilityRole="alert" style={ui.error}>{loadError}</Text>
          <AppButton title="Retry" onPress={() => setAttempt((value) => value + 1)} />
          <AppButton title="Sign out" variant="text" onPress={() => {
            void signOut().catch(() => setLoadError("Unable to sign out. Please retry."));
          }} />
        </> : <ActivityIndicator accessibilityLabel="Loading your plan" />}
      </View>
    );
  }

  return <EditablePlan initialPlan={initialPlan} userId={userId}>{children}</EditablePlan>;
}

function EditablePlan({ initialPlan, userId, children }: PropsWithChildren<{
  initialPlan: StoredPlan;
  userId: string;
}>) {
  const [trackingPreference, setTrackingPreference] = useState(initialPlan.trackingPreference);
  const [tracking, setTracking] = useState<TrackingState>({
    balance: initialPlan.balance,
    balanceUpdatedAt: initialPlan.balanceUpdatedAt,
    purchases: initialPlan.purchases,
  });
  const balance = String(tracking.balance);
  function updateBalance(value: number) {
    const now = new Date().toISOString();
    setTracking((current) => updateTrackingBalance(current, value, now));
  }
  function addPurchase(amount: number, note = "") {
    const purchase = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      amount: Math.round(amount * 100) / 100,
      note: note.trim(),
      createdAt: new Date().toISOString(),
    };
    setTracking((current) => recordPurchase(current, purchase));
  }
  const [savingsMode, setSavingsMode] = useState<SavingsMode>(
    initialPlan.savingsPercentage === null ? "amount" : "percentage",
  );
  const [savingsValue, setSavingsValue] = useState(String(
    initialPlan.savingsPercentage ?? initialPlan.savingsAmount ?? "",
  ));
  const [billItems, setBillItems] = useState(initialPlan.billItems);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const queue = useRef<Autosave<PlanInput> | null>(null);
  const validationError = savingsError(savingsMode, savingsValue);
  const validBalance = !!balance.trim() && Number.isFinite(Number(balance));
  const { savingsAmount, savingsPercentage } = savingsSetting(savingsMode, savingsValue);
  const savingsReserved = calculateSavingsReserved(
    Number(balance),
    savingsAmount,
    savingsPercentage,
  );
  const initialInput: PlanInput = {
    balance: initialPlan.balance,
    trackingPreference: initialPlan.trackingPreference,
    balanceUpdatedAt: initialPlan.balanceUpdatedAt,
    purchases: initialPlan.purchases,
    savingsAmount: initialPlan.savingsAmount,
    savingsPercentage: initialPlan.savingsPercentage,
    billItems: initialPlan.billItems,
  };

  // Initialize only after loading; mounting must never overwrite a remote plan.
  useEffect(() => {
    const autosave = new Autosave(initialInput, (plan) => requestPlan(userId, plan), setSaveState);
    queue.current = autosave;
    return () => { autosave.dispose(); queue.current = null; };
  }, [initialPlan, userId]);

  useEffect(() => {
    queue.current?.update(validBalance && !validationError && Number.isFinite(savingsReserved) ? {
      balance: Number(balance),
      trackingPreference,
      balanceUpdatedAt: tracking.balanceUpdatedAt,
      purchases: tracking.purchases,
      savingsAmount,
      savingsPercentage,
      billItems,
    } : null);
  }, [
    balance,
    validBalance,
    trackingPreference,
    tracking,
    savingsAmount,
    savingsPercentage,
    savingsReserved,
    validationError,
    billItems,
  ]);

  function changeSavingsMode(mode: SavingsMode) {
    if (mode === savingsMode) return;
    setSavingsValue(mode === "percentage"
      ? "10"
      : String(Number.isFinite(savingsReserved) && savingsReserved > 0 ? savingsReserved : ""));
    setSavingsMode(mode);
  }

  return (
    <PlanContext.Provider value={{
      saveState, balance, trackingPreference, setTrackingPreference,
      balanceUpdatedAt: tracking.balanceUpdatedAt, purchases: tracking.purchases,
      updateBalance, addPurchase, savingsMode, savingsValue, setSavingsValue,
      changeSavingsMode, savingsReserved, validationError, billItems, setBillItems,
    }}>
      {children}
    </PlanContext.Provider>
  );
}

export function usePlan() {
  const context = useContext(PlanContext);
  if (!context) throw new Error("usePlan must be used inside PlanProvider");
  return context;
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: "center", padding: 28, gap: 16, backgroundColor: palette.background },
});
