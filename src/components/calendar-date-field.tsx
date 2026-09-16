import { AppButton } from "@/components/app-button";
import { palette, ui } from "@/constants/design";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Keyboard, Platform, Pressable, Text, View } from "react-native";

export type CalendarDateFieldProps = {
  value: Date | null;
  onChange: (date: Date) => void;
  accessibilityLabel: string;
  placeholder: string;
  minimumDate?: Date;
  maximumDate?: Date;
  initialDate?: Date;
  disabled?: boolean;
};

export function CalendarDateField({
  value,
  onChange,
  accessibilityLabel,
  placeholder,
  minimumDate,
  maximumDate,
  initialDate = new Date(),
  disabled = false,
}: CalendarDateFieldProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => {
          Keyboard.dismiss();
          setOpen(true);
        }}
        style={({ pressed }) => [
          ui.input,
          styles.trigger,
          (pressed || disabled) && styles.dimmed,
        ]}
      >
        <Text style={value ? styles.value : ui.body}>
          {value ? value.toLocaleDateString() : placeholder}
        </Text>
      </Pressable>
      {open && (
        <View>
          <DateTimePicker
            value={value ?? initialDate}
            mode="date"
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            display={Platform.OS === "ios" ? "inline" : "default"}
            themeVariant="light"
            accentColor={palette.accent}
            onChange={(_event, selected) => {
              if (Platform.OS === "android") setOpen(false);
              if (selected) onChange(selected);
            }}
          />
          {Platform.OS === "ios" && (
            <AppButton
              title="Done"
              variant="secondary"
              onPress={() => setOpen(false)}
            />
          )}
        </View>
      )}
    </>
  );
}

const styles = {
  trigger: { justifyContent: "center" as const },
  value: { color: palette.text, fontSize: 16 },
  dimmed: { opacity: 0.6 },
};
