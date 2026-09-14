import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

function requireEnvironmentVariable(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

const supabaseUrl = requireEnvironmentVariable("SUPABASE_URL");
const supabasePublishableKey = requireEnvironmentVariable(
  "SUPABASE_PUBLISHABLE_KEY",
);

export const supabase = createClient(supabaseUrl, supabasePublishableKey);

export function createUserSupabaseClient(accessToken: string) {
  return createClient(supabaseUrl, supabasePublishableKey, {
    accessToken: async () => accessToken,
  });
}
