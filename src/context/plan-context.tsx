import { AppButton } from "@/components/app-button";
import { palette, ui } from "@/constants/design";
import { Autosave, type SaveState } from "@/lib/autosave";
import {
  calculateSavingsReserved,
  initialSavingsChoice,
  recordTransaction,
  type TransactionKind,
  updateTrackingBalance,
  type TrackingPreference,
  type TrackingState,
  savingsError,
  savingsSetting,
  type SavingsMode,
  type PlanInput,
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
  supportsIncome: boolean;
  supportsRecurringBills: boolean;
  supportsIncomeSavings: boolean;
  balance: string;
  trackingPreference: TrackingPreference | null;
  setTrackingPreference: Dispatch<SetStateAction<TrackingPreference | null>>;
  balanceUpdatedAt: string | null;
  purchases: TrackingState["purchases"];
  updateBalance: (value: number) => void;
  addTransaction: (kind: TransactionKind, amount: number, note?: string) => void;
  savingsMode: SavingsMode;
  changeSavingsMode: (mode: SavingsMode) => void;
  savingsValue: string;
  incomeReserveValue: string;
  setIncomeReserveValue: (value: string) => void;
  setSavingsValue: Dispatch<SetStateAction<string>>;
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
    incomeSavingsReserved: initialPlan.incomeSavingsReserved ?? 0,
  });
  const balance = String(tracking.balance);
  function updateBalance(value: number) {
    const now = new Date().toISOString();
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setTracking((current) => updateTrackingBalance(current, value, now, id));
  }
  function addTransaction(kind: TransactionKind, amount: number, note = "") {
    if (kind === "income" && !initialPlan.supportsIncome) return;
    const transaction = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      amount: Math.round(amount * 100) / 100,
      kind,
      note: note.trim(),
      createdAt: new Date().toISOString(),
    };
    setIncomeReserveDraft(null);
    setTracking((current) => recordTransaction(current, transaction,
      savingsMode === "income" ? Number(savingsValue) : null));
  }
  const initialSavings = initialSavingsChoice(initialPlan);
  const [savingsMode, setSavingsMode] = useState<SavingsMode>(initialSavings.mode);
  const [savingsValue, setSavingsValue] = useState(initialSavings.value);
  const [incomeReserveDraft, setIncomeReserveDraft] = useState<string | null>(null);
  const incomeReserveValue = incomeReserveDraft ?? String(tracking.incomeSavingsReserved ?? 0);
  function setIncomeReserveValue(value: string) {
    setIncomeReserveDraft(value);
    if (value.trim() && Number.isFinite(Math.round(Number(value) * 100)) && Number(value) >= 0) {
      setTracking((current) => ({ ...current, incomeSavingsReserved: Math.round(Number(value) * 100) / 100 }));
    }
  }
  const [billItems, setBillItems] = useState(initialPlan.billItems);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const queue = useRef<Autosave<PlanInput> | null>(null);
  const validationError = savingsError(savingsMode, savingsValue) || (savingsMode === "income" &&
    (!incomeReserveValue.trim() || !Number.isFinite(Math.round(Number(incomeReserveValue) * 100)) || Number(incomeReserveValue) < 0)
    ? "Enter a valid reserved amount." : "");
  const validBalance = !!balance.trim() && Number.isFinite(Number(balance));
  const setting = savingsSetting(savingsMode, savingsValue);
  const { savingsAmount, savingsPercentage } = setting;
  const savingsIncomePercentage = setting.savingsIncomePercentage ?? null;
  const savingsReserved = savingsMode === "income" ? tracking.incomeSavingsReserved ?? 0 : calculateSavingsReserved(
    Number(balance),
    savingsAmount,
    savingsPercentage,
    savingsIncomePercentage,
    tracking.incomeSavingsReserved ?? 0,
  );
  const initialInput: PlanInput = {
    balance: initialPlan.balance,
    trackingPreference: initialPlan.trackingPreference,
    balanceUpdatedAt: initialPlan.balanceUpdatedAt,
    purchases: initialPlan.purchases,
    savingsAmount: initialPlan.savingsAmount,
    savingsPercentage: initialPlan.savingsPercentage,
    savingsIncomePercentage: initialPlan.savingsIncomePercentage ?? null,
    incomeSavingsReserved: initialPlan.incomeSavingsReserved ?? 0,
    billItems: initialPlan.billItems,
  };

  // Initialize from the loaded plan without overwriting it on mount.
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
      savingsIncomePercentage,
      incomeSavingsReserved: tracking.incomeSavingsReserved ?? 0,
      billItems,
    } : null);
  }, [
    balance,
    validBalance,
    trackingPreference,
    tracking,
    savingsAmount,
    savingsPercentage,
    savingsIncomePercentage,
    savingsReserved,
    validationError,
    billItems,
  ]);

  function changeSavingsMode(mode: SavingsMode) {
    if (mode === savingsMode) return;
    if (mode === "income" && !initialPlan.supportsIncomeSavings) return;
    const currentBalance = Number(balance);
    const reserve = Number.isFinite(savingsReserved) ? savingsReserved : 0;
    setIncomeReserveDraft(null);
    if (mode === "income") setTracking((current) => ({ ...current, incomeSavingsReserved: reserve }));
    setSavingsValue(mode === "income" ? (savingsMode === "percentage" ? savingsValue : "10") : mode === "percentage"
      ? String(currentBalance > 0 ? Math.min(100, Math.round(reserve / currentBalance * 10000) / 100) : 0)
      : String(reserve));
    setSavingsMode(mode);
  }

  return (
    <PlanContext.Provider value={{
      saveState, balance, trackingPreference, setTrackingPreference,
      supportsIncome: initialPlan.supportsIncome,
      supportsRecurringBills: initialPlan.supportsRecurringBills,
      supportsIncomeSavings: initialPlan.supportsIncomeSavings,
      balanceUpdatedAt: tracking.balanceUpdatedAt, purchases: tracking.purchases,
      updateBalance, addTransaction, savingsMode, changeSavingsMode, savingsValue, setSavingsValue,
      savingsReserved, validationError, incomeReserveValue, setIncomeReserveValue, billItems, setBillItems,
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
