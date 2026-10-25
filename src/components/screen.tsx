import type { PropsWithChildren } from "react";
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { palette } from "@/constants/design";

export function Screen({ children }: PropsWithChildren) {
  const insets = useSafeAreaInsets();
  // React Native Web accepts CSS lengths; native padding remains numeric.
  const safeAreaPadding = Platform.OS === "web"
    ? {
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 24px)" as unknown as number,
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 32px)" as unknown as number,
      }
    : { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 };
  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, safeAreaPadding]}>
        <Pressable accessible={false} onPress={Keyboard.dismiss} style={styles.stack}>
          {children}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.background },
  content: { flexGrow: 1, width: "100%", maxWidth: 560, alignSelf: "center", paddingHorizontal: 20 },
  stack: { gap: 24 },
});
