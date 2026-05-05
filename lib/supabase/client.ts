import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let supabaseBrowserClient: SupabaseClient | null = null;

// Factory used by several screens to access Supabase from Expo / React Native.
// A singleton client also exists in lib/supabase.ts; keep auth options aligned
// if either setup changes.
export const getSupabaseBrowserClient = () => {
  if (supabaseBrowserClient) {
    return supabaseBrowserClient;
  }

  // The non-null assertions mirror current app startup assumptions: Supabase
  // credentials must be present in .env with EXPO_PUBLIC_ prefixes.
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

  // Keep a single instance so auth state, token refresh, and listeners stay
  // consistent across screens that import this helper.
  supabaseBrowserClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      // React Native does not have localStorage, so Supabase persists auth
      // sessions through AsyncStorage.
      storage: AsyncStorage,
      persistSession: true,
      autoRefreshToken: true,
      // Native OAuth callbacks are handled manually by Expo deep links.
      detectSessionInUrl: false
    }
  });

  return supabaseBrowserClient;

};
