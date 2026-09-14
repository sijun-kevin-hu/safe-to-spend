import { requestPlan } from "@/lib/plan-api";
import type { Bill } from "@/types/bill";
import {
    createContext,
    Dispatch,
    PropsWithChildren,
    SetStateAction,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react";
import { ActivityIndicator, Button, Text, View } from "react-native";
import { useAuth } from "./auth-context";

type PlanContextValue = {
  save: () => Promise<void>;
  saving: boolean;
  status: string;
  balance: string;
  setBalance: Dispatch<SetStateAction<string>>;
  savingsGoal: string;
  setSavingsGoal: Dispatch<SetStateAction<string>>;
  billItems: Bill[];
  setBillItems: Dispatch<SetStateAction<Bill[]>>;
};

const PlanContext = createContext<PlanContextValue | undefined>(undefined);

export function PlanProvider({ children }: PropsWithChildren) {
  const { session, signOut } = useAuth();
  const userId = session!.user.id;
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const inFlight = useRef(false);
  const [balance, setBalance] = useState("");
  const [savingsGoal, setSavingsGoal] = useState("");
  const [billItems, setBillItems] = useState<Bill[]>([]);

  useEffect(() => {
    let active = true;
    setLoadError("");
    requestPlan(userId)
      .then((plan) => {
        if (!active) return;
        setBalance(String(plan.balance));
        setSavingsGoal(String(plan.savingsGoal));
        setBillItems(plan.billItems);
        setLoaded(true);
      })
      .catch(() => {
        if (active)
          setLoadError(
            "Unable to load your saved plan. Check your connection and retry.",
          );
      });
    return () => {
      active = false;
    };
  }, [userId, attempt]);
  useEffect(() => {
    if (loaded) setStatus("Changes are saved when you tap Save plan.");
  }, [balance, savingsGoal, billItems, loaded]);

  async function save() {
    if (!loaded || inFlight.current) return;
    const next = {
      balance: Number(balance),
      savingsGoal: Number(savingsGoal || 0),
      billItems,
    };
    if (
      !balance.trim() ||
      !Number.isFinite(next.balance) ||
      !Number.isFinite(next.savingsGoal) ||
      next.savingsGoal < 0
    ) {
      setStatus("Enter a valid balance and nonnegative savings amount.");
      return;
    }
    if (billItems.some((bill) => !bill.dueDate)) {
      setStatus("Each bill needs a due date before saving.");
      return;
    }
    inFlight.current = true;
    setSaving(true);
    setStatus("Saving…");
    try {
      await requestPlan(userId, next);
      setStatus("Plan saved.");
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Unable to save. Please retry.",
      );
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }
  if (!loaded)
    return (
      <View
        style={{
          flex: 1,
          padding: 28,
          justifyContent: "center",
          backgroundColor: "#fff",
        }}
      >
        {loadError ? (
          <>
            <Text style={{ color: "#B42318", marginBottom: 16 }}>
              {loadError}
            </Text>
            <Button
              title="Retry"
              onPress={() => setAttempt((value) => value + 1)}
            />
            <Button
              title="Sign out"
              onPress={() => {
                signOut().catch(() =>
                  setLoadError("Unable to sign out. Please retry."),
                );
              }}
            />
          </>
        ) : (
          <ActivityIndicator accessibilityLabel="Loading your plan" />
        )}
      </View>
    );

  return (
    <PlanContext.Provider
      value={{
        save,
        saving,
        status,
        balance,
        setBalance,
        savingsGoal,
        setSavingsGoal,
        billItems,
        setBillItems,
      }}
    >
      {children}
    </PlanContext.Provider>
  );
}

export function usePlan() {
  const context = useContext(PlanContext);

  if (context === undefined) {
    throw new Error("usePlan must be used inside PlanProvider");
  }

  return context;
}
