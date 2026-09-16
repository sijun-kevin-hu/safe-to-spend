import { AppButton } from "@/components/app-button";
import { CalendarDateField } from "@/components/calendar-date-field";
import { palette, ui } from "@/constants/design";
import { useAuth } from "@/context/auth-context";
import { requestProfile } from "@/lib/profile-api";
import { toDateOnly } from "@/lib/format";
import { useCallback, useEffect, useState, type PropsWithChildren } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type Status = "loading" | "editing" | "saving" | "load-error" | "complete";

export function ProfileOnboarding({ children }: PropsWithChildren) {
  const { session, signOut } = useAuth();
  const [status, setStatus] = useState<Status>("loading");
  const [name, setName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState("");
  const userId = session?.user.id;
  const saving = status === "saving";

  const loadProfile = useCallback(async () => {
    if (!userId) return;
    setStatus("loading");
    setError("");
    try {
      const profile = await requestProfile(userId);
      setStatus(profile ? "complete" : "editing");
    } catch (loadError) {
      setStatus("load-error");
      setError(loadError instanceof Error ? loadError.message : "Unable to load your profile.");
    }
  }, [userId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  async function saveProfile() {
    const displayName = name.trim().replace(/\s+/g, " ");
    if (displayName.length < 2) {
      setError("Enter your full name.");
      return;
    }
    if (!dateOfBirth) {
      setError("Choose your date of birth.");
      return;
    }
    if (!userId) return;
    setStatus("saving");
    setError("");
    try {
      await requestProfile(userId, {
        displayName,
        dateOfBirth: toDateOnly(dateOfBirth),
      });
      setStatus("complete");
    } catch (saveError) {
      setStatus("editing");
      setError(saveError instanceof Error ? saveError.message : "Unable to save your profile.");
    }
  }

  if (status === "loading") {
    return (
      <View style={styles.centered}>
        <ActivityIndicator accessibilityLabel="Loading profile" color={palette.accent} />
      </View>
    );
  }
  if (status === "complete") return children;

  if (status === "load-error") {
    return (
      <View style={styles.centeredPage}>
        <View style={styles.loadCard}>
          <Text style={ui.sectionTitle}>Profile unavailable</Text>
          <Text accessibilityRole="alert" style={ui.error}>{error}</Text>
          <AppButton title="Try again" onPress={() => void loadProfile()} />
          <AppButton title="Sign out" variant="text" onPress={() => void signOut()} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Text style={styles.brand}>Safe to Spend</Text>
        <View style={styles.card}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepText}>One last step</Text>
          </View>
          <Text style={ui.title}>Tell us about you</Text>
          <Text style={ui.body}>
            Add your name and birthday to finish setting up your private profile.
          </Text>

          <View style={styles.field}>
            <Text style={ui.label}>Full name</Text>
            <TextInput
              accessibilityLabel="Full name"
              autoComplete="name"
              autoCapitalize="words"
              editable={!saving}
              maxLength={100}
              onBlur={() => setFocused(false)}
              onChangeText={setName}
              onFocus={() => setFocused(true)}
              placeholder="Your full name"
              placeholderTextColor="#667085"
              returnKeyType="done"
              style={[ui.input, focused && styles.focused]}
              value={name}
            />
          </View>

          <View style={styles.field}>
            <Text style={ui.label}>Date of birth</Text>
            <CalendarDateField
              disabled={saving}
              value={dateOfBirth}
              onChange={setDateOfBirth}
              accessibilityLabel="Choose your date of birth"
              placeholder="Choose your date of birth"
              maximumDate={new Date()}
              initialDate={new Date(2000, 0, 1)}
            />
          </View>

          <View style={styles.privacyNote}>
            <Text style={styles.privacyMark}>✓</Text>
            <Text style={styles.privacyText}>
              Your details stay with your account and are never used to connect to a bank.
            </Text>
          </View>

          {!!error && (
            <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={ui.error}>
              {error}
            </Text>
          )}
          <AppButton
            title={saving ? "Saving…" : "Finish setup"}
            disabled={saving}
            onPress={saveProfile}
          />
          <AppButton
            title="Sign out"
            variant="text"
            disabled={saving}
            onPress={() => void signOut()}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.background },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.background,
  },
  centeredPage: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: palette.background,
  },
  loadCard: {
    ...ui.card,
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
    borderWidth: 1,
    borderColor: palette.border,
  },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
    padding: 24,
    paddingVertical: 56,
  },
  brand: {
    color: palette.accent,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 20,
  },
  card: { ...ui.card, borderWidth: 1, borderColor: palette.border },
  stepBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: palette.soft,
  },
  stepText: { color: palette.accent, fontSize: 13, fontWeight: "700" },
  field: { gap: 0 },
  focused: { borderColor: palette.accent, borderWidth: 2 },
  privacyNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    backgroundColor: palette.soft,
  },
  privacyMark: { color: palette.accent, fontSize: 16, fontWeight: "800" },
  privacyText: { flex: 1, color: palette.muted, fontSize: 13, lineHeight: 19 },
});
