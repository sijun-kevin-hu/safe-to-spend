import type { Bill } from "@/types/bill";
import {
    createContext,
    Dispatch,
    PropsWithChildren,
    SetStateAction,
    useContext,
    useState,
} from "react";

type PlanContextValue = {
  balance: string;
  setBalance: Dispatch<SetStateAction<string>>;
  savingsGoal: string;
  setSavingsGoal: Dispatch<SetStateAction<string>>;
  billItems: Bill[];
  setBillItems: Dispatch<SetStateAction<Bill[]>>;
};

const PlanContext = createContext<PlanContextValue | undefined>(undefined);

export function PlanProvider({ children }: PropsWithChildren) {
  const [balance, setBalance] = useState("");
  const [savingsGoal, setSavingsGoal] = useState("");
  const [billItems, setBillItems] = useState<Bill[]>([]);

  return (
    <PlanContext.Provider
      value={{
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
