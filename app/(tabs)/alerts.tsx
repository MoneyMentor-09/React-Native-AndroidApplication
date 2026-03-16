/**
 * Ionicons
 * --------
 * Icon library provided by Expo. This allows us to easily display
 * vector icons within React Native applications. Here it is used
 * to visually represent alerts/notifications.
 */
import { Ionicons } from "@expo/vector-icons";

/**
 * React Native UI components
 * --------------------------
 * View      → Container for layout and grouping components.
 * Text      → Displays text content.
 * StyleSheet→ Optimized way to define component styles.
 * Pressable → Component that detects touch interactions
 *             (used here for the navigation button).
 */
import { View, Text, StyleSheet, Pressable } from "react-native";

/**
 * Router
 * ------
 * Provided by expo-router to handle navigation between screens.
 * router.push() allows programmatic navigation to another route.
 */
import { router } from "expo-router";

/**
 * alertsScreen Component
 * ----------------------
 * This screen represents the Alerts page of the application.
 * It informs users about alerts such as:
 * - Budget warnings
 * - Unusual spending notifications
 * - Reminder notifications
 */
export default function alertsScreen() {
  return (

    /**
     * Main container for the entire screen.
     * It centers all elements both vertically and horizontally.
     */
    <View style={styles.container}>

      {/*
        Icon wrapper container.
        Provides a soft background and rounded shape
        to visually highlight the alert icon.
      */}
      <View style={styles.iconWrap}>
        <Ionicons
          name="alert-circle-outline"  // Ionicon representing alerts
          size={40}                    // Icon size in pixels
          color="#2563EB"              // Primary blue color
        />
      </View>

      {/*
        Screen title.
        Clearly indicates that the page is the Alerts section.
      */}
      <Text style={styles.title}>Alerts</Text>

      {/*
        Subtitle / description text.
        Explains what types of alerts the user will see here.
      */}
      <Text style={styles.subtitle}>
        Stay on top of budget alerts, unusual spending, and reminders.
      </Text>

      {/*
        Navigation Button
        -----------------
        When pressed, the user is taken back to the Dashboard screen.
        router.push() adds the dashboard screen to the navigation stack.
      */}
      <Pressable
        style={styles.button}
        onPress={() => router.push("/dashboard")}
      >
        <Text style={styles.buttonText}>Back to Dashboard</Text>
      </Pressable>

    </View>
  );
}

/**
 * Stylesheet
 * ----------
 * Central location where all component styles are defined.
 * This improves readability and performance.
 */
const styles = StyleSheet.create({

  /**
   * container
   * ---------
   * Main layout wrapper for the screen.
   */
  container: {
    flex: 1,                     // Take full screen height
    justifyContent: "center",    // Center items vertically
    alignItems: "center",        // Center items horizontally
    backgroundColor: "#FFFFFF",  // White background
    paddingHorizontal: 24,       // Horizontal padding for spacing
  },

  /**
   * iconWrap
   * --------
   * Decorative container for the alert icon.
   */
  iconWrap: {
    width: 88,                   // Width of the icon container
    height: 88,                  // Height of the icon container
    borderRadius: 24,            // Rounded corners
    backgroundColor: "#EFF6FF",  // Light blue background
    alignItems: "center",        // Center icon horizontally
    justifyContent: "center",    // Center icon vertically
    marginBottom: 20,            // Space below icon
  },

  /**
   * title
   * -----
   * Main heading text for the screen.
   */
  title: {
    fontSize: 28,                // Large text size
    fontWeight: "800",           // Extra bold font
    color: "#111827",            // Dark gray text color
  },

  /**
   * subtitle
   * --------
   * Supporting descriptive text.
   */
  subtitle: {
    marginTop: 12,               // Space above subtitle
    fontSize: 16,                // Standard readable size
    lineHeight: 22,              // Line spacing for readability
    color: "#6B7280",            // Muted gray text
    textAlign: "center",         // Center text alignment
    maxWidth: 320,               // Prevent text from stretching too wide
    marginBottom: 24,            // Space before the button
  },

  /**
   * button
   * ------
   * Styling for the navigation button.
   */
  button: {
    backgroundColor: "#2563EB",  // Primary blue color
    paddingHorizontal: 20,       // Horizontal padding inside button
    paddingVertical: 14,         // Vertical padding inside button
    borderRadius: 14,            // Rounded button edges
  },

  /**
   * buttonText
   * ----------
   * Styling applied to the text inside the button.
   */
  buttonText: {
    color: "#FFFFFF",            // White text
    fontSize: 16,                // Medium text size
    fontWeight: "700",           // Bold font
  },
});