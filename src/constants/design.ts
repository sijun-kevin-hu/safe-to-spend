import { StyleSheet } from "react-native";

// The MVP uses one calm, light palette on every platform.
export const palette = {
  background: "#F6F8F7", surface: "#FFFFFF", text: "#172B23",
  muted: "#52665E", accent: "#167D5A", border: "#CBD8D1",
  soft: "#E8F5EF", danger: "#B42318", dangerSoft: "#FDECEC",
} as const;

export const ui = StyleSheet.create({
  title: { fontSize: 28, fontWeight: "700", color: palette.text },
  sectionTitle: { fontSize: 20, fontWeight: "700", color: palette.text },
  body: { fontSize: 15, lineHeight: 22, color: palette.muted },
  label: { fontSize: 14, fontWeight: "600", color: palette.text, marginBottom: 8 },
  card: { backgroundColor: palette.surface, padding: 20, borderRadius: 16, gap: 16 },
  input: {
    minHeight: 48, borderWidth: 1, borderColor: palette.border,
    borderRadius: 12, padding: 12, fontSize: 16, color: palette.text,
    backgroundColor: palette.surface
  },
  error: { color: palette.danger, fontSize: 14, lineHeight: 20 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 16 },
  money: { fontVariant: ["tabular-nums"], fontWeight: "600", color: palette.text },
});
