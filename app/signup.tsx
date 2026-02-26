// React hook for managing local component state
// Each form field and UI toggle is controlled via useState.
import { useState } from "react";

/**
 * Core React Native components
 * ---------------------------------------------------------
 * These handle layout, scrolling, keyboard behavior,
 * touch interactions, and styling.
 */
import {
  Image,
  Platform,
  KeyboardAvoidingView,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

/**
 * Expo Router
 * ---------------------------------------------------------
 * Used for navigation between screens.
 * - push(): adds to stack
 * - replace(): replaces current screen (used for auth flows)
 */
import { router } from "expo-router";

/**
 * Icon library for password visibility toggles.
 * Using Ionicons keeps UI visually consistent with native apps.
 */
import { Ionicons } from "@expo/vector-icons";

/**
 * Supabase client instance.
 * Responsible for communicating with backend authentication services.
 */
import { supabase } from "../lib/supabase";

/**
 * Custom abstraction for OAuth login.
 * Keeps OAuth logic separate from UI logic.
 */
import { signInWithOAuth } from "../lib/auth";

export default function SignUpScreen() {
  /**
   * ==========================================================
   * STATE MANAGEMENT
   * ==========================================================
   * 
   * This component uses controlled inputs:
   * Every field is tied directly to state.
   * This ensures predictable validation and UI updates.
   */

  // Determines signup method (email vs phone)
  const [mode, setMode] = useState<"email" | "phone">("email");

  // Form field states
  const [fullName, setFullName] = useState("");
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // UI toggles for password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Error message displayed below form inputs
  const [authError, setAuthError] = useState("");

  // Global loading state disables interactions during async calls
  const [loading, setLoading] = useState(false);

  /**
   * Derived boolean:
   * Used to disable the Create Account button until required fields are filled.
   * This prevents unnecessary API calls.
   */
  const canSubmit =
    fullName.trim().length > 0 &&
    emailOrPhone.trim().length > 0 &&
    password.length > 0 &&
    confirmPassword.length > 0;

  /**
   * ==========================================================
   * ACCOUNT CREATION HANDLER
   * ==========================================================
   * 
   * Responsibilities:
   * 1. Validate input locally
   * 2. Prevent invalid submissions
   * 3. Send request to Supabase
   * 4. Handle errors
   * 5. Navigate on success
   */
  const handleCreateAccount = async () => {
    // Clear any previous error message
    setAuthError("");

    // Trim inputs to prevent whitespace issues
    const trimmedFullName = fullName.trim();
    const identifier = emailOrPhone.trim();

    // Collect all validation errors at once
    const validationErrors: string[] = [];

    /**
     * Validation layer (client-side)
     * ---------------------------------------------------------
     * This improves UX by catching obvious issues
     * before making a network request.
     */

    if (!trimmedFullName) {
      validationErrors.push("Full name is required.");
    }

    if (!identifier) {
      validationErrors.push(
        mode === "email"
          ? "Email address is required."
          : "Phone number is required."
      );
    }

    // Password strength checks
    if (password.length < 8) {
      validationErrors.push("Password must be at least 8 characters.");
    }

    if (!/[A-Z]/.test(password)) {
      validationErrors.push("Password must include at least one uppercase letter.");
    }

    if (!/\d/.test(password)) {
      validationErrors.push("Password must include at least one number.");
    }

    if (password !== confirmPassword) {
      validationErrors.push("Passwords do not match.");
    }

    // If any validation fails, display them and stop execution
    if (validationErrors.length > 0) {
      setAuthError(validationErrors.join("\n"));
      return;
    }

    /**
     * Begin authentication request
     * ---------------------------------------------------------
     * Set loading state to:
     * - Disable buttons
     * - Prevent duplicate submissions
     */
    setLoading(true);

    /**
     * Attach additional metadata to Supabase user.
     * This becomes accessible in user metadata.
     */
    const options = { data: { full_name: trimmedFullName } };

    /**
     * Payload structure depends on signup mode.
     * Supabase accepts either:
     * - { email, password }
     * - { phone, password }
     */
    const payload =
      mode === "email"
        ? { email: identifier, password, options }
        : { phone: identifier, password, options };

    // Perform signup request
    const { error } = await supabase.auth.signUp(payload);

    setLoading(false);

    // If backend returns error, show it to user
    if (error) {
      setAuthError(error.message);
      return;
    }

    /**
     * On success:
     * - If email confirmation required → user must confirm externally
     * - If not required → session is created immediately
     *
     * Using replace() prevents navigating back to signup screen.
     */
    router.replace("/dashboard");
  };

  /**
   * ==========================================================
   * GOOGLE OAUTH HANDLER
   * ==========================================================
   * 
   * This uses Supabase OAuth.
   * Flow:
   * 1. Trigger OAuth provider (Google)
   * 2. Redirect back to app
   * 3. Navigate to dashboard
   */
  const handleGoogle = async () => {
    try {
      setLoading(true);
      setAuthError("");

      await signInWithOAuth("google");

      router.replace("/dashboard");
    } catch (error: any) {
      setAuthError(error?.message ?? "Google sign in failed.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * ==========================================================
   * UI RENDER
   * ==========================================================
   * 
   * Layout Structure:
   * SafeAreaView
   *   └── KeyboardAvoidingView
   *         └── ScrollView
   *               ├── Form Content
   *               └── Bottom CTA Section
   */

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topContent}>
            
            {/* Title Section */}
            <Text style={styles.title}>Create your account</Text>

            {/* Marketing subtitle */}
            <Text style={styles.subtitle}>
              Join thousands of users taking control of their finances
            </Text>

            {/* OAuth Button */}
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

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Email / Phone Toggle */}
            <View style={styles.segmentedControl}>
              {/* Email */}
              <Pressable
                style={[
                  styles.segmentButton,
                  mode === "email" && styles.segmentButtonActive,
                ]}
                onPress={() => {
                  setMode("email");
                  setEmailOrPhone("");
                  setAuthError("");
                }}
              >
                <Text
                  style={[
                    styles.segmentText,
                    mode === "email" && styles.segmentTextActive,
                  ]}
                >
                  Email
                </Text>
              </Pressable>

              {/* Phone */}
              <Pressable
                style={[
                  styles.segmentButton,
                  mode === "phone" && styles.segmentButtonActive,
                ]}
                onPress={() => {
                  setMode("phone");
                  setEmailOrPhone("");
                  setAuthError("");
                }}
              >
                <Text
                  style={[
                    styles.segmentText,
                    mode === "phone" && styles.segmentTextActive,
                  ]}
                >
                  Phone
                </Text>
              </Pressable>
            </View>

            {/* Full Name */}
            <TextInput
              style={styles.input}
              placeholder="Full name"
              autoCapitalize="words"
              value={fullName}
              onChangeText={(text) => {
                setFullName(text);
                setAuthError("");
              }}
            />

            {/* Email or Phone */}
            <TextInput
              style={styles.input}
              placeholder={mode === "email" ? "Email address" : "Phone number"}
              keyboardType={mode === "email" ? "email-address" : "phone-pad"}
              autoCapitalize="none"
              value={emailOrPhone}
              onChangeText={(text) => {
                setEmailOrPhone(text);
                setAuthError("");
              }}
            />

            {/* Password */}
            <View style={styles.passwordInputWrapper}>
              <TextInput
                style={[styles.input, styles.inputWithIcon]}
                placeholder="Password"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setAuthError("");
                }}
              />
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

            {/* Confirm Password */}
            <View style={styles.passwordInputWrapper}>
              <TextInput
                style={[styles.input, styles.inputWithIcon]}
                placeholder="Confirm password"
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  setAuthError("");
                }}
              />
              <Pressable
                style={styles.eyeButton}
                onPress={() =>
                  setShowConfirmPassword((prev) => !prev)
                }
              >
                <Ionicons
                  name={
                    showConfirmPassword
                      ? "eye-off-outline"
                      : "eye-outline"
                  }
                  size={20}
                  color="#667085"
                />
              </Pressable>
            </View>

            {/* Error Display */}
            {!!authError && (
              <Text style={styles.authErrorText}>{authError}</Text>
            )}
          </View>

          {/* Bottom CTA Section */}
          <View style={styles.bottomSection}>
            <Pressable
              style={[
                styles.createButton,
                !canSubmit && styles.createButtonDisabled,
              ]}
              disabled={!canSubmit || loading}
              onPress={handleCreateAccount}
            >
              <Text
                style={[
                  styles.createButtonText,
                  (!canSubmit || loading) &&
                    styles.createButtonTextDisabled,
                ]}
              >
                {loading ? "Creating..." : "Create Account"}
              </Text>
            </Pressable>

            <View style={styles.signInRow}>
              <Text style={styles.signInPrompt}>
                Already have an account?
              </Text>
              <TouchableOpacity onPress={() => router.push("/login")}>
                <Text style={styles.signInLink}>Sign in</Text>
              </TouchableOpacity>
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    padding: 24,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  topContent: {
    paddingTop: 90,
  },
  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 6,
    marginBottom: 10,
  },
  backButtonText: {
    color: "#1D4ED8",
    fontSize: 16,
    fontWeight: "600",
  },
  title: {
    textAlign: "center",
    fontSize: 34,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.6,
  },
  subtitle: {
    textAlign: "center",
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: "#667085",
    marginBottom: 22,
    // marginHorizontal: 24,
  },
  googleButton: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E4E7EC",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#101828",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
  },
  googleButtonDisabled: {
    opacity: 0.7,
  },
  googleButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  googleIcon: {
    width: 18,
    height: 18,
    marginRight: 10,
  },
  googleButtonText: {
    color: "#1D2939",
    fontSize: 15,
    fontWeight: "600",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#EAECF0",
  },
  dividerText: {
    color: "#98A2B3",
    fontSize: 13,
    fontWeight: "500",
  },
  segmentedControl: {
    flexDirection: "row",
    backgroundColor: "#F2F4F7",
    borderRadius: 12,
    padding: 4,
    marginBottom: 14,
  },
  segmentButton: {
    flex: 1,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  segmentButtonActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#101828",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 1,
  },
  segmentText: {
    color: "#667085",
    fontSize: 14,
    fontWeight: "600",
  },
  segmentTextActive: {
    color: "#111827",
  },
  input: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D0D5DD",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    color: "#111827",
    fontSize: 15,
    marginBottom: 12,
  },
  passwordInputWrapper: {
    position: "relative",
  },
  inputWithIcon: {
    paddingRight: 46,
  },
  eyeButton: {
    position: "absolute",
    right: 14,
    top: 16,
    height: 20,
    width: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  authErrorText: {
    marginTop: 10,
    color: "#DC2626",
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "500",
  },
  bottomSection: {
    marginTop: "auto",
    paddingTop: 16,
    // paddingBottom: 18,
  },
  createButton: {
    height: 54,
    borderRadius: 999,
    backgroundColor: "#1D4ED8",
    alignItems: "center",
    justifyContent: "center",
  },
  createButtonDisabled: {
    backgroundColor: "#D0D5DD",
  },
  createButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  createButtonTextDisabled: {
    color: "#667085",
  },
  signInRow: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  signInPrompt: {
    color: "#667085",
    fontSize: 14,
  },
  signInLink: {
    color: "#1D4ED8",
    fontSize: 14,
    fontWeight: "700",
  },
});
