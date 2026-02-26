/**
 * ==========================================================
 * LOGIN SCREEN
 * ==========================================================
 * 
 * Responsibilities:
 * 1. Capture user credentials (email + password)
 * 2. Perform client-side validation
 * 3. Authenticate using Supabase
 * 4. Handle errors gracefully
 * 5. Redirect user on success
 */

import { useState } from "react";

/**
 * React Native UI primitives.
 * KeyboardAvoidingView ensures inputs are not hidden behind keyboard.
 */
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

/**
 * Expo Router for navigation.
 * replace() is used to prevent navigating back to login after authentication.
 */
import { router } from "expo-router";

/**
 * Supabase client used for authentication requests.
 */
import { supabase } from "../lib/supabase";
import { signInWithOAuth } from "../lib/auth";

export default function LoginScreen() {
  /**
   * ==========================================================
   * STATE MANAGEMENT
   * ==========================================================
   * 
   * Controlled inputs ensure UI always reflects current state.
   */

  // Email input value
  const [email, setEmail] = useState("");

  // Password input value
  const [password, setPassword] = useState("");

  // Authentication error message (displayed to user)
  const [error, setError] = useState("");

  // Loading state disables button and prevents duplicate submissions
  const [loading, setLoading] = useState(false);

  /**
   * ==========================================================
   * LOGIN HANDLER
   * ==========================================================
   * 
   * Flow:
   * 1. Validate input
   * 2. Call Supabase authentication
   * 3. Handle error or success
   */
  const handleLogin = async () => {
    /**
     * Basic client-side validation
     * Prevents unnecessary API calls.
     */
    if (!email.trim() || !password.trim()) {
      setError("Please enter both email and password.");
      return;
    }

    // Begin loading state
    setLoading(true);
    setError(""); // Clear any previous error

    /**
     * Supabase authentication call
     * signInWithPassword expects:
     * {
     *   email: string,
     *   password: string
     * }
     */
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    // Stop loading once response is received
    setLoading(false);

    /**
     * If authentication fails:
     * - Supabase returns error object
     * - Display error message
     */
    if (authError) {
      setError(authError.message);
      return;
    }

    /**
     * If authentication succeeds:
     * - Supabase creates a session
     * - Replace current screen with dashboard
     * 
     * replace() prevents the user from going back to login.
     */
    router.replace("/dashboard");
  };

  const handleGoogle = async () => {
    try {
      setLoading(true);
      setError("");
      await signInWithOAuth("google");
      router.replace("/dashboard");
    } catch (oauthError: any) {
      setError(oauthError?.message ?? "Google sign in failed.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * ==========================================================
   * UI STRUCTURE
   * ==========================================================
   * 
   * KeyboardAvoidingView
   *   └── Container
   *         ├── Logo
   *         ├── Title + Subtitle
   *         ├── Email Input
   *         ├── Password Input
   *         ├── Error Message
   *         └── Login Button
   */

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 0}
    >
      <View style={styles.container}>
        <View style={styles.topSection}>
          {/* Screen Heading */}
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>

          <Pressable
            style={[
              styles.googleButton,
              loading ? styles.googleButtonDisabled : undefined,
            ]}
            onPress={handleGoogle}
            disabled={loading}
          >
            <View style={styles.googleButtonContent}>
              {!loading ? (
                <Image
                  source={require("../assets/Google-icon.png")}
                  style={styles.googleIcon}
                  resizeMode="contain"
                />
              ) : null}
              <Text style={styles.googleButtonText}>
                {loading ? "Please wait..." : "Continue with Google"}
              </Text>
            </View>
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Or continue with email</Text>
            <View style={styles.dividerLine} />
          </View>

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#8A8F99"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#8A8F99"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {!!error && <Text style={styles.errorText}>{error}</Text>}
        </View>

        <View style={styles.bottomSection}>
          <Pressable
            style={[
              styles.loginButton,
              loading ? styles.loginButtonDisabled : undefined,
            ]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.loginButtonText}>
              {loading ? "Signing in..." : "Login"}
            </Text>
          </Pressable>

          <View style={styles.signUpRow}>
            <Text style={styles.signUpPrompt}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push("/signup")} disabled={loading}>
              <Text style={styles.signUpLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

/**
 * ==========================================================
 * STYLES
 * ==========================================================
 * 
 * Clean, minimal design:
 * - Soft grays for input borders
 * - Bold primary button
 * - Clear error state styling
 */
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 18,
  },
  topSection: {
    marginTop: 150,
  },

  /**
   * Logo styling:
   * Soft blue background to create visual identity
   */
  logoPlaceholder: {
    alignSelf: "center",
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  logoText: {
    color: "#334155",
    fontSize: 20,
    fontWeight: "700",
  },

  title: {
    textAlign: "center",
    color: "#111827",
    fontSize: 34,
    fontWeight: "800",
    marginBottom: 6,
  },
  subtitle: {
    textAlign: "center",
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: "#667085",
    marginBottom: 22,
  },
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
  googleButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  googleButtonDisabled: {
    opacity: 0.7,
  },
  googleIcon: {
    width: 18,
    height: 18,
    marginRight: 10,
  },
  googleButtonText: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "600",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E7EB",
  },
  dividerText: {
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "500",
  },

  /**
   * Input styling:
   * Rounded borders
   * Subtle gray border for clean UI
   */
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

  /**
   * Error styling:
   * Red tone indicates invalid state
   */
  errorText: {
    color: "#DC2626",
    marginTop: 4,
    fontSize: 14,
  },
  bottomSection: {
    marginTop: "auto",
    paddingTop: 16,
    paddingBottom: 28,
  },

  /**
   * Primary login button
   */
  loginButton: {
    // marginTop: 9,
    width: "99%",
    height: 54,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
  },

  /**
   * Disabled state softens button color
   */
  loginButtonDisabled: {
    backgroundColor: "#93B4F8",
  },

  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  signUpRow: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  signUpPrompt: {
    color: "#6B7280",
    fontSize: 14,
  },
  signUpLink: {
    color: "#2563EB",
    fontSize: 14,
    fontWeight: "700",
  },
});
