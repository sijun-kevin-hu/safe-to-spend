import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";

Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }) });

export function useSavingsReminders(userId: string, pending: number, saved: boolean) {
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const serial = useRef(Promise.resolve());
  const identifier = `savings-reminder-${userId}`;
  const key = `savings-reminders:${userId}`;
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(key).then(value => { if (active) { setEnabled(value === "true"); setReady(true); } }).catch(() => { if (active) setError("Unable to load reminder settings."); });
    const listener = AppState.addEventListener("change", state => {
      if (state === "active") void Notifications.getPermissionsAsync().then(p => {
        if (active && !p.granted) { setEnabled(false); void AsyncStorage.setItem(key, "false"); }
      }).catch(() => { if (active) setError("Unable to check notification permission."); });
    });
    return () => { active = false; listener.remove(); serial.current = serial.current.then(() => Notifications.cancelScheduledNotificationAsync(identifier)).catch(() => {}); };
  }, [key, identifier]);
  useEffect(() => {
    if (!ready || !saved) return;
    let active = true;
    serial.current = serial.current.then(async () => {
      await Notifications.cancelScheduledNotificationAsync(identifier);
      if (!active || !enabled || pending === 0) return;
      const permission = await Notifications.getPermissionsAsync();
      if (!permission.granted) { setEnabled(false); await AsyncStorage.setItem(key, "false"); return; }
      await Notifications.scheduleNotificationAsync({ identifier,
        content: { title: "A little toward savings", body: "You have savings waiting to move. Open Safe to Spend to review.", sound: false },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 18, minute: 0, channelId: "savings" } });
    }).catch(() => { if (active) setError("Unable to schedule reminders. Try turning them on again."); });
    return () => { active = false; };
  }, [ready, enabled, pending, saved, identifier, key]);
  async function toggle() {
    if (busy || !ready) return;
    setBusy(true); setError("");
    try {
      const next = !enabled;
      if (next) {
        if (Platform.OS === "android") await Notifications.setNotificationChannelAsync("savings", { name: "Savings reminders", importance: Notifications.AndroidImportance.DEFAULT });
        const permission = await Notifications.requestPermissionsAsync();
        if (!permission.granted) { setError("Allow notifications in your device settings to get reminders."); return; }
      }
      await AsyncStorage.setItem(key, String(next)); setEnabled(next);
    } catch { setError("Unable to update reminders. Please retry."); }
    finally { setBusy(false); }
  }
  return { available: true, enabled, busy: busy || !ready, error, toggle };
}
