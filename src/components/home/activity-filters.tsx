import { CalendarDateField } from "@/components/calendar-date-field";
import { palette, ui } from "@/constants/design";
import { datePresets, type DatePreset } from "@/lib/activity-dates";
import { Pressable, StyleSheet, Text, View } from "react-native";

export function ActivityFilters({ preset, onPreset, start, end, onStart, onEnd, count }: {
  preset: DatePreset; onPreset: (value: DatePreset) => void;
  start: Date | null; end: Date | null; onStart: (value: Date) => void; onEnd: (value: Date) => void; count: number;
}) {
  const invalid = preset === "custom" && (!start || !end || start > end);
  return <View style={styles.stack}>
    <View accessibilityRole="radiogroup" accessibilityLabel="Activity date filter" style={styles.choices}>
      {datePresets.map(([value,label]) => <Pressable key={value} accessibilityRole="radio"
        accessibilityState={{checked:preset === value}} onPress={() => onPreset(value)}
        style={({pressed}) => [styles.chip, preset === value && styles.selected, pressed && {opacity:0.7}]}>
        <Text style={[styles.label,preset === value && styles.selectedLabel]}>{label}</Text>
      </Pressable>)}
    </View>
    {preset === "custom" && <View style={styles.range}>
      <View style={styles.date}><Text style={ui.label}>From</Text><CalendarDateField value={start} onChange={onStart}
        accessibilityLabel="Filter start date" placeholder="Start date" maximumDate={new Date()} /></View>
      <View style={styles.date}><Text style={ui.label}>Through</Text><CalendarDateField value={end} onChange={onEnd}
        accessibilityLabel="Filter end date" placeholder="End date" maximumDate={new Date()} /></View>
    </View>}
    <Text accessibilityLiveRegion="polite" style={invalid ? ui.error : styles.caption}>
      {invalid ? !start || !end ? "Choose both dates to see activity." : "The end date must be on or after the start date."
        : `${count} ${count === 1 ? "entry" : "entries"}${preset === "all" ? " in your history" : " in this range"}`}
    </Text>
  </View>;
}
const styles = StyleSheet.create({
  stack:{gap:14}, choices:{flexDirection:"row",flexWrap:"wrap",gap:8},
  chip:{minHeight:44,paddingVertical:11,paddingHorizontal:14,borderRadius:24,borderWidth:1,borderColor:palette.border,backgroundColor:palette.surface,justifyContent:"center"},
  selected:{backgroundColor:palette.accent,borderColor:palette.accent},
  label:{color:palette.muted,fontSize:13,fontWeight:"600"},selectedLabel:{color:palette.surface},
  range:{flexDirection:"row",flexWrap:"wrap",gap:12},date:{flexGrow:1,flexBasis:150,minWidth:0},
  caption:{...ui.body,fontSize:13},
});
