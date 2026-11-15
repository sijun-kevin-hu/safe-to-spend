import { AppButton } from "@/components/app-button";
import { ActivityContent } from "@/components/home/purchase-home";
import { palette, ui } from "@/constants/design";
import { Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function ActivitySheet({ onClose, onLogged }: { onClose: () => void; onLogged: (message: string) => void }) {
  const insets = useSafeAreaInsets();
  function close() {
    Keyboard.dismiss();
    onClose();
  }

  return <Modal transparent animationType="slide" visible onRequestClose={close}
    statusBarTranslucent navigationBarTranslucent>
    <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Pressable accessible={false} onPress={close} style={styles.backdrop} />
      <View accessibilityViewIsModal role="dialog" aria-label="Activity" style={styles.sheet}>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={ui.sectionTitle}>Log activity</Text>
          <AppButton title="Done" variant="text" onPress={close} />
        </View>
        <ScrollView keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <ActivityContent compact onBalance={close} onSaved={(message) => {
            close();
            onLogged(message);
          }} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(0, 0, 0, 0.35)" },
  sheet: { height: "85%", width: "100%", maxWidth: 560, alignSelf: "center",
    backgroundColor: palette.background, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    overflow: "hidden" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingLeft: 24, paddingRight: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: palette.border },
  content: { padding: 20, gap: 20 },
});
