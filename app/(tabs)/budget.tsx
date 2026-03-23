/**
 * Ionicons
 * --------
 * A vector icon library included with Expo. It provides a large set
 * of prebuilt icons that can be easily used in React Native apps.
 * In this screen, the wallet icon visually represents budgeting
 * and financial management.
 */
import { Ionicons } from "@expo/vector-icons";

/**
 * React Native Core Components
 * ----------------------------
 * View       → Layout container used to group UI elements.
 * Text       → Displays textual content.
 * StyleSheet → Utility for defining component styles efficiently.
 * Pressable  → Touchable component that handles user interaction.
 */
import { View, Text, StyleSheet, Pressable } from "react-native";

/**
 * Router from expo-router
 * -----------------------
 * Used for navigation between screens. The router.push()
 * method allows the app to navigate programmatically
 * to another route in the application.
 */
import { router } from "expo-router";

/**
 * budgetScreen Component
 * ----------------------
 * This screen represents the Budget section of the application.
 * It provides users with a high-level entry point to manage
 * spending limits and track financial activity.
 */
export default function budgetScreen() {
  return (

    /**
     * Main container that centers the UI content
     * both vertically and horizontally.
     */
    <View style={styles.container}>

      {/*
        Icon container
        --------------
        Provides a rounded background around the icon
        to visually highlight the budgeting feature.
      */}
      <View style={styles.iconWrap}>
        <Ionicons
          name="wallet-outline"   // Icon representing a wallet / budget
          size={40}               // Icon size in pixels
          color="#2563EB"         // Primary application blue
        />
      </View>

      {/*
        Screen Title
        ------------
        Main heading that indicates the purpose of the page.
      */}
      <Text style={styles.title}>Budget</Text>

      {/*
        Subtitle / Description
        ----------------------
        Provides context for what users can do on this screen.
        Explains that budgets and spending limits can be managed.
      */}
      <Text style={styles.subtitle}>
        Manage your spending limits and track progress across accounts.
      </Text>

      {/*
        Navigation Button
        -----------------
        When the user presses this button, they are navigated
        to the Transactions screen where they can review
        individual spending records.
      */}
      <Pressable
        style={styles.button}
        onPress={() => router.push("/transactions")}
      >
        <Text style={styles.buttonText}>Review Transactions</Text>
      </Pressable>

    </View>
  );
}

/**
 * Styles
 * ------
 * Centralized styling definitions for this screen.
 */
const styles = StyleSheet.create({

  /**
   * container
   * ---------
   * Main layout container for the screen.
   */
  container: {
    flex: 1,                     // Occupies full screen height
    justifyContent: "center",    // Centers content vertically
    alignItems: "center",        // Centers content horizontally
    backgroundColor: "#FFFFFF",  // White background
    paddingHorizontal: 24,       // Horizontal padding for spacing
  },

  /**
   * iconWrap
   * --------
   * Container that holds and styles the icon.
   */
  iconWrap: {
    width: 88,                   // Width of icon container
    height: 88,                  // Height of icon container
    borderRadius: 24,            // Rounded corners
    backgroundColor: "#EFF6FF",  // Light blue background
    alignItems: "center",        // Center icon horizontally
    justifyContent: "center",    // Center icon vertically
    marginBottom: 20,            // Space below icon
  },

  /**
   * title
   * -----
   * Styling for the main screen heading.
   */
  title: {
    fontSize: 28,                // Large font size
    fontWeight: "800",           // Extra bold text
    color: "#111827",            // Dark gray color
  },

  /**
   * subtitle
   * --------
   * Secondary descriptive text below the title.
   */
  subtitle: {
    marginTop: 12,               // Space above subtitle
    fontSize: 16,                // Readable font size
    lineHeight: 22,              // Line spacing for readability
    color: "#6B7280",            // Muted gray color
    textAlign: "center",         // Center alignment
    maxWidth: 320,               // Limits line width for readability
    marginBottom: 24,            // Space above the button
  },

  /**
   * button
   * ------
   * Styling for the navigation button.
   */
  button: {
    backgroundColor: "#2563EB",  // Primary blue
    paddingHorizontal: 20,       // Horizontal padding inside button
    paddingVertical: 14,         // Vertical padding inside button
    borderRadius: 14,            // Rounded edges
  },

  /**
   * buttonText
   * ----------
   * Styling for the text displayed inside the button.
   */
  buttonText: {
    color: "#FFFFFF",            // White text
    fontSize: 16,                // Medium font size
    fontWeight: "700",           // Bold text
  },
});