import { supabase } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";
import { AppState } from "react-native";

const AuthContext = createContext<
  | {
      session: Session | null;
      loading: boolean;
      error: string;
      signOut: () => Promise<void>;
    }
  | undefined
>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let active = true;
    let receivedEvent = false;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      receivedEvent = true;
      if (active) {
        setSession(next);
        setLoading(false);
      }
    });

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active || receivedEvent) return;
        setSession(data.session);
        if (error) setError(error.message);
        setLoading(false);
      })
      .catch(() => {
        if (active) {
          setError("Unable to restore your session. Please sign in.");
          setLoading(false);
        }
      });

    const refresh = (state: string) =>
      state === "active"
        ? supabase?.auth.startAutoRefresh()
        : supabase?.auth.stopAutoRefresh();
    refresh(AppState.currentState);

    const listener = AppState.addEventListener("change", refresh);
    return () => {
      active = false;
      subscription.unsubscribe();
      listener.remove();
      supabase?.auth.stopAutoRefresh();
    };
  }, []);
  async function signOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) throw error;
    setSession(null);
  }
  return (
    <AuthContext.Provider value={{ session, loading, error, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be inside AuthProvider");
  return value;
}
