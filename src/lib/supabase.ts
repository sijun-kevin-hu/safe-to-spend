import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { createClient } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto";

// Static web rendering has no browser storage or session to restore.
const isServerRender = Platform.OS === "web" && typeof window === "undefined";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const supabase =
  url && key
    ? createClient(url, key, {
        auth: {
          storage: isServerRender ? undefined : AsyncStorage,
          persistSession: !isServerRender,
          autoRefreshToken: !isServerRender,
          detectSessionInUrl: false,
        },
      })
    : null;
