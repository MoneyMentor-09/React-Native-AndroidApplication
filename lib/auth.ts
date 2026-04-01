/**
 * Expo AuthSession
 * ---------------------------------------------------------
 * Used to create redirect URIs that work across:
 * - Development (Expo Go)
 * - Standalone builds
 * - Production builds
 */
import * as AuthSession from "expo-auth-session";

/**
 * Expo WebBrowser
 * ---------------------------------------------------------
 * Used to open an in-app browser for OAuth flows.
 * Handles returning control to the app after authentication.
 */
import * as WebBrowser from "expo-web-browser";

/**
 * Supabase Provider type
 * Ensures only valid OAuth providers are passed (e.g., "google").
 */
import type { Provider } from "@supabase/supabase-js";

/**
 * Supabase client instance
 */
import { supabase } from "./supabase";

/**
 * Ensures any pending auth session is properly completed
 * (important on iOS when app resumes from browser).
 */
WebBrowser.maybeCompleteAuthSession();

/**
 * ==========================================================
 * signInWithOAuth
 * ==========================================================
 * 
 * Handles full OAuth login flow:
 * 1. Generate redirect URI
 * 2. Ask Supabase for provider login URL
 * 3. Open OAuth session in browser
 * 4. Capture returned tokens
 * 5. Manually set Supabase session
 */
export async function signInWithOAuth(provider: Provider) {

  /**
   * STEP 1: Generate Redirect URI
   * ---------------------------------------------------------
   * This must match:
   * - Your app.json "scheme"
   * - The redirect URL registered in Supabase
   *
   * Example deep link:
   * moneymentor://auth/callback
   */
  const redirectTo = AuthSession.makeRedirectUri({
    scheme: "moneymentor",
    path: "auth/callback",
  });

  /**
   * STEP 2: Request OAuth URL from Supabase
   * ---------------------------------------------------------
   * skipBrowserRedirect: true
   * Prevents Supabase from auto-redirecting in web.
   * We handle browser opening manually via Expo.
   */
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) throw error;
  if (!data?.url) throw new Error("No OAuth URL returned by Supabase.");

  /**
   * STEP 3: Open OAuth Session
   * ---------------------------------------------------------
   * Opens provider login page in secure browser.
   * Waits for redirect back to app.
   */
  const result = await WebBrowser.openAuthSessionAsync(
    data.url,
    redirectTo
  );

  /**
   * If user cancels or flow fails, result.type !== "success"
   */
  if (result.type !== "success" || !result.url) {
    throw new Error("Google sign in was cancelled or did not complete.");
  }

  /**
   * STEP 4: Extract Tokens from Redirect URL
   * ---------------------------------------------------------
   * Supabase returns tokens in URL hash fragment:
   * moneymentor://auth/callback#access_token=...&refresh_token=...
   */
  const callbackUrl = new URL(result.url);

  // Remove leading '#' and parse query-like parameters
  const hashParams = new URLSearchParams(
    callbackUrl.hash.replace(/^#/, "")
  );

  const access_token = hashParams.get("access_token");
  const refresh_token = hashParams.get("refresh_token");

  if (!access_token || !refresh_token) {
    throw new Error("Missing tokens in OAuth callback.");
  }

  /**
   * STEP 5: Manually Set Supabase Session
   * ---------------------------------------------------------
   * This stores:
   * - access_token
   * - refresh_token
   *
   * Supabase will:
   * - Persist session
   * - Handle token refresh automatically
   */
  const { error: sessionError } = await supabase.auth.setSession({
    access_token,
    refresh_token,
  });

  if (sessionError) throw sessionError;

  /**
   * At this point:
   * - User is authenticated
   * - Supabase session is active
   * - Calling screen can now navigate to dashboard
   */
}