import { AppButton } from "@/components/app-button";
import { palette, ui } from "@/constants/design";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Keyboard, Platform, Pressable, Text, View } from "react-native";

export type DueDateFieldProps = {
  value: Date | null;
  onChange: (date: Date) => void;
};

export function DueDateField({ value, onChange }: DueDateFieldProps) {
  const [open, setOpen] = useState(false);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel="Choose a due date"
        onPress={() => { Keyboard.dismiss(); setOpen(true); }}
        style={({ pressed }) => [ui.input, { justifyContent: "center", opacity: pressed ? 0.6 : 1 }]}>
        <Text style={ui.body}>{value ? value.toLocaleDateString() : "Choose a due date"}</Text>
      </Pressable>
      {open && <View>
        <DateTimePicker
          value={value ?? today}
          mode="date"
          minimumDate={today}
          display={Platform.OS === "ios" ? "inline" : "default"}
          themeVariant="light"
          accentColor={palette.accent}
          onChange={(_event, selected) => {
            if (Platform.OS === "android") setOpen(false);
            if (selected) onChange(selected);
          }}
        />
        {Platform.OS === "ios" && <AppButton title="Done" variant="secondary" onPress={() => setOpen(false)} />}
      </View>}
    </>
  );
}
