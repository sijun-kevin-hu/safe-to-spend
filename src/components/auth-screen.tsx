import { AppButton } from "@/components/app-button";
import { palette, ui } from "@/constants/design";
import { supabase } from "@/lib/supabase";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from "react-native";

export function AuthScreen() {
  const [creating, setCreating] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [messageKind, setMessageKind] = useState<"error" | "success">("error");
  const [focusedField, setFocusedField] = useState<"email" | "password" | null>(null);
  const [message, setMessage] = useState("");
  async function submit() {
    if (!supabase || busy) return;
    setMessageKind("error");
    if (!email.trim() || !password) {
      setMessage("Enter your email and password.");
      return;
    }
    if (creating && password.length < 8) {
      setMessage("Use at least 8 characters for your password.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const credentials = { email: email.trim(), password };
      const { data, error } = creating
        ? await supabase.auth.signUp(credentials)
        : await supabase.auth.signInWithPassword(credentials);
      if (error) throw error;
      setPassword("");
      if (creating && !data.session) {
        setMessageKind("success");
        setMessage(
          "Check your email to confirm your account, then return here to sign in.",
        );
        setCreating(false);
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to connect. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#fff" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Text style={styles.brand}>Safe to Spend</Text>
        <Text style={styles.title}>
          {creating ? "Create your account" : "Welcome back"}
        </Text>
        <Text style={styles.hint}>
          Keep your plan private and ready when you need it. No bank connection
          required.
        </Text>
        {!supabase && (
          <Text accessibilityRole="alert" style={styles.message}>
            Add the mobile Supabase variables to your root .env file and restart
            Expo.
          </Text>
        )}
        <Text style={styles.label}>Email</Text>
        <TextInput
          accessibilityLabel="Email"
          onFocus={() => setFocusedField("email")}
          onBlur={() => setFocusedField(null)}
          style={[styles.input, focusedField === "email" && styles.focused]}
          value={email}
          onChangeText={setEmail}
          editable={!busy}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          placeholder="you@example.com"
          placeholderTextColor="#667085"
        />
        <Text style={styles.label}>Password</Text>
        <TextInput
          accessibilityLabel="Password"
          onFocus={() => setFocusedField("password")}
          onBlur={() => setFocusedField(null)}
          style={[styles.input, focusedField === "password" && styles.focused]}
          value={password}
          onChangeText={setPassword}
          editable={!busy}
          secureTextEntry
          autoCapitalize="none"
          autoComplete={creating ? "new-password" : "current-password"}
          placeholder={creating ? "At least 8 characters" : "Your password"}
          placeholderTextColor="#667085"
          returnKeyType="go"
          onSubmitEditing={submit}
        />
        {!!message && (
          <Text accessibilityLiveRegion="polite" style={[styles.message, messageKind === "success" && { color: palette.accent }]}>
            {message}
          </Text>
        )}
        <AppButton title={busy ? "Please wait…" : creating ? "Create account" : "Sign in"}
          disabled={busy || !supabase} onPress={submit} />
        <AppButton title={creating ? "Already have an account? Sign in" : "New here? Create an account"}
          variant="text" disabled={busy} onPress={() => {
            setCreating(!creating); setMessage(""); setPassword("");
          }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 28,
    paddingVertical: 70,
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
  },
  brand: {
    color: "#167D5A",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 28,
  },
  title: { color: "#111", fontSize: 30, fontWeight: "700" },
  hint: {
    color: "#52665E",
    fontSize: 16,
    lineHeight: 24,
    marginTop: 12,
    marginBottom: 20,
  },
  label: {
    color: "#344054",
    marginTop: 16,
    marginBottom: 8,
    fontWeight: "600",
  },
  input: {
    backgroundColor: "#fff",
    color: "#111",
    borderWidth: 2,
    borderColor: "#B8C0BD",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 16,
  },
  message: { ...ui.error, marginBottom: 16 },
  focused: { borderColor: palette.accent, borderWidth: 2 },
});
