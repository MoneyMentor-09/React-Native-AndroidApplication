/**
 * ==========================================================
 * LOGIN SCREEN (Fixed Bottom Button Version)
 * ==========================================================
 * Purpose:
 * - Provides email/password login via Supabase.
 * - Provides Google OAuth login via a helper (signInWithOAuth).
 * - Keeps the primary "Login" CTA fixed at the bottom of the screen,
 *   while allowing the form content to scroll behind it.
 *
 * Key UX Goals:
 * - Avoid keyboard covering inputs by using KeyboardAvoidingView + ScrollView.
 * - Prevent the fixed bottom CTA from overlapping scroll content by padding
 *   the ScrollView's contentContainerStyle (paddingBottom).
 */

import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";

// Supabase client instance configured in ../lib/supabase.
// Used here for email/password authentication.
import { supabase } from "../lib/supabase";

// OAuth helper wrapper (likely built on expo-auth-session / WebBrowser).
// Handles provider flow and stores Supabase session tokens.
import { signInWithOAuth } from "../lib/auth";

export default function LoginScreen() {
  /**
   * Local state for form fields and UI behavior.
   */
  const [email, setEmail] = useState("");               // User's email input
  const [password, setPassword] = useState("");         // User's password input
  const [showPassword, setShowPassword] = useState(false); // Toggles password visibility
  const [error, setError] = useState("");               // Displays validation/auth errors
  const [loading, setLoading] = useState(false);        // Locks UI while auth is in progress

  /**
   * handleLogin
   * -----------
   * Performs Supabase email/password login.
   * - Validates required fields
   * - Calls supabase.auth.signInWithPassword
   * - Navigates to dashboard on success
   */
  const handleLogin = async () => {
    // Basic client-side validation to avoid unnecessary auth calls.
    if (!email.trim() || !password.trim()) {
      setError("Please enter both email and password.");
      return;
    }

    // Lock the UI while the request runs to prevent double-submits.
    setLoading(true);
    setError("");

    // Supabase email/password authentication.
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    // Unlock UI regardless of result.
    setLoading(false);

    // If Supabase returns an error, surface it to the user.
    if (authError) {
      setError(authError.message);
      return;
    }

    // Replace prevents the user from going "back" to the login screen
    // after a successful sign-in.
    router.replace("/dashboard");
  };

  /**
   * handleGoogle
   * ------------
   * Initiates Google OAuth login via a helper function.
   * - Sets loading state and clears errors
   * - Awaits the OAuth flow completion
   * - Navigates to dashboard on success
   *
   * Note:
   * If your OAuth flow already redirects back into the app and updates session
   * asynchronously, you might choose to navigate only after confirming session.
   */
  const handleGoogle = async () => {
    try {
      setLoading(true);
      setError("");

      // Provider key is passed to the helper to start the correct flow.
      await signInWithOAuth("google");

      // On success, move user into the main app.
      router.replace("/dashboard");
    } catch (oauthError: any) {
      // Defensive error handling: prefer a message if provided.
      setError(oauthError?.message ?? "Google sign in failed.");
    } finally {
      // Ensure UI unlocks even if something throws.
      setLoading(false);
    }
  };

  /**
   * Height reserved for the fixed bottom section.
   * This value is used to pad the ScrollView so the last items
   * don't get hidden behind the bottom-fixed CTA area.
   */
  const BOTTOM_FIXED_HEIGHT = 120;

  return (
    // Root container for the entire screen.
    <View style={styles.root}>
      {/* 
        KeyboardAvoidingView
        --------------------
        Pushes content up when the keyboard opens (iOS primarily).
        For Android, behavior is often handled by windowSoftInputMode,
        so we keep behavior undefined there.
      */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 0}
      >
        {/*
          ScrollView
          ----------
          Allows form content to scroll if it exceeds screen height.
          keyboardShouldPersistTaps="handled" ensures taps on buttons/inputs
          are handled properly even when keyboard is open.
        */}
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.scrollContent,

            // Add bottom padding so content isn't covered by bottomFixed.
            { paddingBottom: BOTTOM_FIXED_HEIGHT },
          ]}
        >
          {/* Top section contains headings + auth inputs */}
          <View style={styles.topSection}>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Log in to continue</Text>

            {/*
              Google OAuth Button
              -------------------
              - Disabled during loading to prevent repeated presses.
              - Hides the Google icon while loading (optional UX choice).
            */}
            <Pressable
              style={[styles.googleButton, loading && styles.googleButtonDisabled]}
              onPress={handleGoogle}
              disabled={loading}
            >
              <View style={styles.googleButtonContent}>
                {/* Only show icon when not loading (avoids layout jitter if desired). */}
                {!loading && (
                  <Image
                    source={require("../assets/Google-icon.png")}
                    style={styles.googleIcon}
                    resizeMode="contain"
                  />
                )}

                {/* Button label changes depending on loading state. */}
                <Text style={styles.googleButtonText}>
                  {loading ? "Please wait..." : "Continue with Google"}
                </Text>
              </View>
            </Pressable>

            {/* Divider between OAuth and email/password login */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Or continue with email</Text>
              <View style={styles.dividerLine} />
            </View>

            {/*
              Email Input
              ----------
              Autofill-related props are set for both iOS and Android:
              - autoComplete/textContentType use "username" to trigger email autofill
              - importantForAutofill="yes" helps Android autofill
            */}
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#8A8F99"
              autoCapitalize="none"
              autoComplete="username"         // iOS autofill hint for username/email
              keyboardType="email-address"
              textContentType="username"      // iOS content type hint
              importantForAutofill="yes"      // Android autofill hint
              value={email}
              onChangeText={setEmail}
            />

            {/*
              Password Input + Eye Toggle
              ---------------------------
              Wrapper uses position:relative so the eye icon can be absolutely positioned.
              secureTextEntry toggles based on showPassword.
            */}
            <View style={styles.passwordInputWrapper}>
              <TextInput
                style={[styles.input, styles.inputWithIcon]}
                placeholder="Password"
                placeholderTextColor="#8A8F99"
                autoComplete="current-password"
                secureTextEntry={!showPassword} // Hide password unless toggled on
                textContentType="password"
                importantForAutofill="yes"
                value={password}
                onChangeText={setPassword}
              />

              {/* Eye button toggles password visibility */}
              <Pressable
                style={styles.eyeButton}
                onPress={() => setShowPassword((prev) => !prev)}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#667085"
                />
              </Pressable>
            </View>

            {/* Conditionally render error only when a non-empty error exists */}
            {!!error && <Text style={styles.errorText}>{error}</Text>}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/*
        Fixed Bottom Section
        --------------------
        - Positioned absolutely so it stays visible even when the form scrolls.
        - Contains the primary CTA ("Login") plus a link to sign up.
      */}
      <View style={styles.bottomFixed}>
        <Pressable
          style={[styles.loginButton, loading && styles.loginButtonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.loginButtonText}>
            {loading ? "Signing in..." : "Login"}
          </Text>
        </Pressable>

        {/* Sign-up prompt row */}
        <View style={styles.signUpRow}>
          <Text style={styles.signUpPrompt}>Don't have an account? </Text>

          {/* TouchableOpacity used for text-like link behavior */}
          <TouchableOpacity
            onPress={() => router.push("/signup")}
            disabled={loading}
          >
            <Text style={styles.signUpLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

/**
 * ==========================================================
 * STYLES
 * ==========================================================
 * Notes:
 * - root uses flex:1 so it fills the screen.
 * - bottomFixed is absolute-positioned; ScrollView gets paddingBottom
 *   to avoid being obscured by this section.
 */
const styles = StyleSheet.create({
  // Root screen wrapper.
  root: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  // Utility style to make children fill available space.
  flex: {
    flex: 1,
  },

  // ScrollView content padding.
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },

  // Container for title/subtitle + form elements.
  topSection: {
    marginTop: 85,
    paddingTop: 10,
  },

  // Main heading.
  title: {
    textAlign: "center",
    color: "#111827",
    fontSize: 34,
    fontWeight: "800",
    marginBottom: 6,
  },

  // Supporting heading/subheading text.
  subtitle: {
    textAlign: "center",
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: "#667085",
    marginBottom: 22,
  },

  // Google OAuth button styling.
  googleButton: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },

  // Visual cue to indicate the button is disabled while loading.
  googleButtonDisabled: {
    opacity: 0.7,
  },

  // Row layout for the icon + text inside the Google button.
  googleButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  // Google icon sizing.
  googleIcon: {
    width: 18,
    height: 18,
    marginRight: 10,
  },

  // Google button label styling.
  googleButtonText: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "600",
  },

  // Divider row between OAuth and email login.
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },

  // Horizontal lines on either side of divider text.
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E7EB",
  },

  // Divider label text.
  dividerText: {
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "500",
  },

  // Base input styling used by both email and password inputs.
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    color: "#111827",
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
  },

  // Wrapper used to position the eye icon inside the password input.
  passwordInputWrapper: {
    position: "relative",
  },

  // Adds right padding so typed password text doesn't overlap the eye icon.
  inputWithIcon: {
    paddingRight: 46,
  },

  // Eye toggle positioned inside the password input field.
  eyeButton: {
    position: "absolute",
    right: 14,
    top: 16,
    height: 20,
    width: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  // Error message styling (red text).
  errorText: {
    color: "#DC2626",
    marginTop: 4,
    fontSize: 14,
  },

  // Fixed bottom CTA container.
  bottomFixed: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 18,
    paddingTop: 16,
    paddingBottom: 28,
    backgroundColor: "#FFFFFF",
  },

  // Primary Login button.
  loginButton: {
    width: "100%",
    height: 54,
    borderRadius: 999, // "pill" style button
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
  },

  // Dimmed button color when disabled/loading.
  loginButtonDisabled: {
    backgroundColor: "#93B4F8",
  },

  // Login button label styling.
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },

  // Row containing "Don't have an account?" + Sign Up link.
  signUpRow: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },

  // Prompt text styling.
  signUpPrompt: {
    color: "#6B7280",
    fontSize: 14,
  },

  // Link-like styling for Sign Up.
  signUpLink: {
    color: "#2563EB",
    fontSize: 14,
    fontWeight: "700",
  },
});