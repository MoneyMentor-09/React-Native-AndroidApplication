/**
 * Supabase client setup for React Native (Expo)
 * ---------------------------------------------------------
 * This file creates and exports a single configured Supabase client.
 * Key goals for React Native:
 * - Provide URL + anon key from Expo env vars
 * - Persist auth sessions using AsyncStorage (since RN has no localStorage)
 * - Allow automatic token refresh
 * - Disable URL session detection (not applicable for native deep links)
 */

import "react-native-url-polyfill/auto";
/**
 * react-native-url-polyfill
 * ---------------------------------------------------------
 * React Native environments may not fully support the WHATWG URL API.
 * Supabase (and related OAuth flows) can rely on URL parsing.
 * This polyfill ensures `URL` and `URLSearchParams` behave consistently.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
/**
 * AsyncStorage
 * ---------------------------------------------------------
 * Supabase auth needs a storage adapter to persist sessions.
 * On web it uses localStorage; on React Native we use AsyncStorage.
 */

import { createClient } from "@supabase/supabase-js";
/**
 * createClient
 * ---------------------------------------------------------
 * Factory function that creates a Supabase client configured for:
 * - Database operations (Postgres)
 * - Auth (GoTrue)
 * - Storage (Supabase Storage)
 */

// Pull credentials from Expo environment variables.
// In Expo, only variables prefixed with EXPO_PUBLIC_ are available at runtime.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Defensive configuration check
 * ---------------------------------------------------------
 * If env vars are missing, fail fast at startup to avoid confusing runtime errors.
 * Common reasons:
 * - .env not loaded
 * - variables not prefixed with EXPO_PUBLIC_
 * - wrong key names
 * - running in a build environment missing the vars
 */
if (!supabaseUrl || !supabaseAnonKey) {
  // Optional debugging:
  // console.log("ENV URL:", process.env.EXPO_PUBLIC_SUPABASE_URL);
  // console.log("ENV KEY:", process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 8));

  throw new Error(
    "Missing Supabase env vars. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY."
  );
}

/**
 * Create and export the Supabase client singleton
 * ---------------------------------------------------------
 * This should be imported anywhere you need to use Supabase.
 * Keeping a single instance avoids duplicated auth state listeners and storage calls.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    /**
     * storage
     * ---------------------------------------------------------
     * Where Supabase persists the session (access token + refresh token).
     * AsyncStorage makes sessions survive app restarts.
     */
    storage: AsyncStorage,

    /**
     * autoRefreshToken
     * ---------------------------------------------------------
     * Automatically refreshes the access token using the refresh token
     * when the access token expires.
     */
    autoRefreshToken: true,

    /**
     * persistSession
     * ---------------------------------------------------------
     * Stores the user session so users remain logged in across app launches.
     */
    persistSession: true,

    /**
     * detectSessionInUrl
     * ---------------------------------------------------------
     * Web-only feature: Supabase reads tokens from the URL after redirects.
     * In React Native (Expo), you typically handle OAuth callbacks manually
     * using deep links (like your signInWithOAuth helper), so this stays false.
     */
    detectSessionInUrl: false,
  },
});