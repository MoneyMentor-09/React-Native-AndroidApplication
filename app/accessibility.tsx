import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

/**
 * AccessibilityTheme
 * ------------------
 * Describes one accessibility theme card.
 */
type AccessibilityTheme = {
  key: string;
  title: string;
  description: string;
};

const ACCESSIBILITY_THEMES: AccessibilityTheme[] = [
  { key: "default", title: "Default", description: "Standard balanced colors" },
  { key: "protanopia", title: "Protanopia", description: "Red-blind optimized" },
  { key: "deuteranopia", title: "Deuteranopia", description: "Green-blind optimized" },
  { key: "tritanopia", title: "Tritanopia", description: "Blue-blind optimized" },
  { key: "monochrome", title: "Monochrome", description: "Grayscale, no color" },
  { key: "highContrast", title: "High Contrast", description: "Maximum contrast for visibility" },
];

/**
 * AccessibilityScreen
 * -------------------
 * Accessibility settings page for theme selection.
 * This version uses local component state for the selected theme.
 * Later this can be connected to account preferences and app-wide theming.
 */
export default function AccessibilityScreen() {
  const [activeTheme, setActiveTheme] = useState("default");

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.root}>
        {/* Top header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={34} color="#475569" />
          </Pressable>

          <View style={styles.headerTitleRow}>
            <Ionicons name="eye-outline" size={34} color="#2563EB" />
            <Text style={styles.headerTitle}>Accessibility</Text>
          </View>

          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Intro info box */}
          <View style={styles.infoBox}>
            <Text style={styles.infoBoxTitle}>WCAG-compliant themes</Text>
            <Text style={styles.infoBoxText}>
              designed for visual accessibility. Choose a color scheme that
              works best for you.
            </Text>
          </View>

          {/* Theme cards */}
          {ACCESSIBILITY_THEMES.map((theme) => {
            const isActive = activeTheme === theme.key;

            return (
              <View
                key={theme.key}
                style={[
                  styles.themeCard,
                  isActive && styles.themeCardActive,
                ]}
              >
                <View style={styles.themeHeaderRow}>
                  <View>
                    <Text style={styles.themeTitle}>{theme.title}</Text>
                    <Text style={styles.themeDescription}>
                      {theme.description}
                    </Text>
                  </View>

                  {theme.key === "default" && (
                    <View style={styles.modeIconWrap}>
                      <Ionicons name="moon-outline" size={28} color="#4B5563" />
                    </View>
                  )}
                </View>

                <Pressable
                  style={[
                    styles.selectButton,
                    isActive && styles.selectButtonActive,
                  ]}
                  onPress={() => setActiveTheme(theme.key)}
                >
                  <Text
                    style={[
                      styles.selectButtonText,
                      isActive && styles.selectButtonTextActive,
                    ]}
                  >
                    {isActive ? "✓ Active (Light)" : "Select"}
                  </Text>
                </Pressable>
              </View>
            );
          })}

          {/* Footer note */}
          <Text style={styles.footerText}>
            Each theme meets WCAG AA/AAA contrast standards
          </Text>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  root: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#D1D5DB",
    backgroundColor: "#F8FAFC",
  },

  backButton: {
    padding: 4,
  },

  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
  },

  headerSpacer: {
    width: 38,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
  },

  infoBox: {
    backgroundColor: "#EAF2FF",
    borderColor: "#A7C7FF",
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 22,
    paddingVertical: 28,
    marginBottom: 20,
  },

  infoBoxTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#334155",
    marginBottom: 8,
  },

  infoBoxText: {
    fontSize: 17,
    lineHeight: 26,
    color: "#334155",
  },

  themeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginBottom: 18,
  },

  themeCardActive: {
    borderColor: "#2563EB",
    borderWidth: 3,
  },

  themeHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 18,
  },

  themeTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 6,
  },

  themeDescription: {
    fontSize: 16,
    color: "#556070",
  },

  modeIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },

  selectButton: {
    height: 60,
    backgroundColor: "#F3F4F6",
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  selectButtonActive: {
    backgroundColor: "#2563EB",
  },

  selectButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
  },

  selectButtonTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  footerText: {
    textAlign: "center",
    color: "#667085",
    fontSize: 16,
    lineHeight: 24,
    marginTop: 18,
    marginBottom: 10,
  },
});
