/**
 * React Native Core Components
 * ----------------------------
 * View       → Container used for layout and grouping UI elements.
 * Text       → Displays textual content.
 * StyleSheet → Creates optimized style objects for better performance.
 * Pressable  → Touchable component used to detect press interactions.
 */
import { View, Text, StyleSheet, Pressable } from "react-native";

/**
 * Router (expo-router)
 * --------------------
 * Allows programmatic navigation between screens.
 * router.push("/ReceiptCaptureScreen") will navigate to the
 * receipt capture page where the user can scan or upload receipts.
 */
import { router } from "expo-router";

/**
 * Ionicons (Expo Vector Icons)
 * ----------------------------
 * Provides scalable vector icons used throughout the UI.
 * In this screen, the receipt icon visually represents
 * financial transactions and spending records.
 */
import { Ionicons } from "@expo/vector-icons";

/**
 * transactionsScreen Component
 * ----------------------------
 * Displays the Transactions page of the application.
 * This screen acts as an entry point for viewing transaction
 * history and adding new spending records.
 */
export default function transactionsScreen() {
  return (
    /**
     * Main screen container
     * ---------------------
     * Centers all elements vertically and horizontally
     * to create a clean "empty-state" style layout.
     */
    <View style={styles.container}>
      {/*
        Icon container
        --------------
        Provides a light-blue background behind the icon
        to visually emphasize the screen purpose.
      */}
      <View style={styles.iconWrap}>
        <Ionicons
          name="receipt-outline" // Receipt icon representing transactions
          size={40}              // Icon size in pixels
          color="#2563EB"        // Primary application blue
        />
      </View>

      {/*
        Screen title
        ------------
        Large heading indicating the current page.
      */}
      <Text style={styles.title}>Transactions</Text>

      {/*
        Supporting description
        ----------------------
        Explains what the user can do on this page.
      */}
      <Text style={styles.subtitle}>
        Review activity and add new spending records from one place.
      </Text>

      {/*
        Primary Call-to-Action Button
        ------------------------------
        Navigates the user to the Receipt Capture screen where they
        can scan or manually add a receipt for a transaction.
      */}
      <Pressable
        style={styles.primaryButton}
        onPress={() => router.push("/ReceiptCaptureScreen")}
      >
        <Text style={styles.primaryButtonText}>Scan or Add Receipt</Text>
      </Pressable>
    </View>
  );
}

/**
 * Styles
 * ------
 * Centralized styling definitions for the Transactions screen.
 */
const styles = StyleSheet.create({
  /**
   * container
   * ---------
   * Main wrapper that fills the screen and centers content.
   */
  container: {
    flex: 1,                     // Occupies full screen height
    justifyContent: "center",    // Center items vertically
    alignItems: "center",        // Center items horizontally
    backgroundColor: "#FFFFFF",  // White background
    paddingHorizontal: 24,       // Horizontal spacing from screen edges
  },

  /**
   * iconWrap
   * --------
   * Decorative container around the icon.
   */
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 24,           // Rounded corners
    backgroundColor: "#EFF6FF", // Light blue background
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },

  /**
   * title
   * -----
   * Main heading text styling.
   */
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
  },

  /**
   * subtitle
   * --------
   * Secondary descriptive text explaining screen purpose.
   */
  subtitle: {
    marginTop: 12,
    fontSize: 16,
    lineHeight: 22,    // Improves readability for multiple lines
    color: "#6B7280",  // Muted gray text
    textAlign: "center",
    maxWidth: 320,     // Prevents overly wide text on larger screens
    marginBottom: 24,
  },

  /**
   * primaryButton
   * -------------
   * Primary action button styling.
   */
  primaryButton: {
    backgroundColor: "#2563EB", // Primary app blue
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
  },

  /**
   * primaryButtonText
   * -----------------
   * Styling for the button label.
   */
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});