/**
 * ==========================================================
 * LOGIN SCREEN (Fixed Bottom Button Version)
 * ==========================================================
 */

import { useState } from "react";
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
import { supabase } from "../lib/supabase";
import { signInWithOAuth } from "../lib/auth";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Please enter both email and password.");
      return;
    }

    setLoading(true);
    setError("");

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

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

  const BOTTOM_FIXED_HEIGHT = 120;

  return (
    <View style={styles.root}>
      {/* Keyboard avoidance only for scrollable form */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 0}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: BOTTOM_FIXED_HEIGHT },
          ]}
        >
          <View style={styles.topSection}>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Log in to continue</Text>

            <Pressable
              style={[
                styles.googleButton,
                loading && styles.googleButtonDisabled,
              ]}
              onPress={handleGoogle}
              disabled={loading}
            >
              <View style={styles.googleButtonContent}>
                {!loading && (
                  <Image
                    source={require("../assets/Google-icon.png")}
                    style={styles.googleIcon}
                    resizeMode="contain"
                  />
                )}
                <Text style={styles.googleButtonText}>
                  {loading ? "Please wait..." : "Continue with Google"}
                </Text>
              </View>
            </Pressable>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>
                Or continue with email
              </Text>
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
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Fixed Bottom Section */}
      <View style={styles.bottomFixed}>
        <Pressable
          style={[
            styles.loginButton,
            loading && styles.loginButtonDisabled,
          ]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.loginButtonText}>
            {loading ? "Signing in..." : "Login"}
          </Text>
        </Pressable>

        <View style={styles.signUpRow}>
          <Text style={styles.signUpPrompt}>
            Don't have an account?{" "}
          </Text>
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
 */

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  topSection: {
    marginTop: 150,
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

  errorText: {
    color: "#DC2626",
    marginTop: 4,
    fontSize: 14,
  },

  bottomFixed: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 18,
    paddingTop: 16,
    paddingBottom: 28,
    backgroundColor: "#FFFFFF",
  },

  loginButton: {
    width: "100%",
    height: 54,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
  },
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
