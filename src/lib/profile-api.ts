import { supabase } from "./supabase";

export type Profile = {
  displayName: string;
  dateOfBirth: string;
};

const apiUrl = process.env.EXPO_PUBLIC_API_URL ||
  "https://safe-to-spend-chi.vercel.app";

function isProfile(value: unknown): value is Profile {
  if (!value || typeof value !== "object") return false;
  const profile = value as Partial<Profile>;
  return typeof profile.displayName === "string" &&
    profile.displayName.trim().length >= 2 &&
    /^\d{4}-\d{2}-\d{2}$/.test(profile.dateOfBirth ?? "");
}

export async function requestProfile(
  userId: string,
  profile?: Profile,
): Promise<Profile | null> {
  if (!supabase) throw new Error("Authentication is not configured.");
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session || data.session.user.id !== userId) {
    throw new Error("Please sign in again.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${apiUrl}/profile`, {
      method: profile ? "PUT" : "GET",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${data.session.access_token}`,
        "Content-Type": "application/json",
      },
      ...(profile ? { body: JSON.stringify(profile) } : {}),
    });
    if (!response.ok) {
      throw new Error(
        response.status === 401
          ? "Your session expired. Please sign in again."
          : profile
            ? "Unable to save your profile. Please try again."
            : "Unable to load your profile. Please try again.",
      );
    }
    const value: unknown = await response.json();
    if (value === null && !profile) return null;
    if (!isProfile(value)) throw new Error("The server returned an invalid profile.");
    if (profile && (
      value.displayName !== profile.displayName ||
      value.dateOfBirth !== profile.dateOfBirth
    )) {
      throw new Error("The server did not save your profile. Please update the API.");
    }
    return value;
  } finally {
    clearTimeout(timeout);
  }
}
