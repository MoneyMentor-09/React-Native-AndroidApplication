/**
 * Ionicons
 * --------
 * Expo's vector icon library. Provides scalable icons that render sharply
 * on different screen sizes and pixel densities.
 * Used here to display a chat icon for the screen header/empty state.
 */
import { Ionicons } from "@expo/vector-icons";

/**
 * React Native Core Components
 * ----------------------------
 * View       → Layout container for grouping UI elements.
 * Text       → Displays text content.
 * StyleSheet → Creates optimized, validated style objects.
 * Pressable  → Touchable component that handles press interactions.
 */
import { View, Text, StyleSheet, Pressable } from "react-native";

/**
 * expo-router router
 * ------------------
 * Used for programmatic navigation between routes/screens.
 * router.push("/transactions") pushes the Transactions screen onto the stack.
 */
import { router } from "expo-router";

/**
 * chatScreen Component
 * --------------------
 * Displays the Chat screen "landing" UI.
 * Current behavior:
 * - Shows an icon, title, and description
 * - Provides a CTA button that navigates to Transactions
 *   (for discussing recent activity).
 *
 * Note: Component names are conventionally PascalCase (ChatScreen),
 * but this will still work as-is.
 */
export default function chatScreen() {
  return (
    /**
     * Main container
     * --------------
     * Centers content vertically and horizontally to create a clean
     * "empty state" / intro screen layout.
     */
    <View style={styles.container}>
      {/*
        Icon wrapper
        ------------
        Creates a rounded light-blue background behind the icon
        to visually highlight the screen purpose.
      */}
      <View style={styles.iconWrap}>
        <Ionicons
          name="chatbox-outline" // Chat bubble icon representing conversation
          size={40}              // Icon size in pixels
          color="#2563EB"        // Primary brand blue
        />
      </View>

      {/*
        Screen title
        ------------
        Large bold header for the page.
      */}
      <Text style={styles.title}>Chat</Text>

      {/*
        Supporting text
        ---------------
        Explains what the chat feature is intended for.
      */}
      <Text style={styles.subtitle}>
        Open a conversation with your finance assistant and ask account questions.
      </Text>

      {/*
        Call-to-action button
        ---------------------
        Navigates user to the Transactions screen so they can review activity
        before discussing it in chat (or as a placeholder route for now).
      */}
      <Pressable
        style={styles.button}
        onPress={() => router.push("/transactions")}
      >
        <Text style={styles.buttonText}>Discuss Recent Activity</Text>
      </Pressable>
    </View>
  );
}

/**
 * Styles
 * ------
 * Centralized screen styles to keep layout consistent across similar pages.
 */
const styles = StyleSheet.create({
  /**
   * container
   * ---------
   * Full-screen wrapper that centers all content.
   */
  container: {
    flex: 1,                    // Fill the entire screen
    justifyContent: "center",   // Center vertically
    alignItems: "center",       // Center horizontally
    backgroundColor: "#FFFFFF", // Clean white background
    paddingHorizontal: 24,      // Side padding for consistent spacing
  },

  /**
   * iconWrap
   * --------
   * Decorative background container for the icon.
   * Keeps icon visually prominent and consistent with other screens.
   */
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 24,           // Rounded corners (soft square)
    backgroundColor: "#EFF6FF", // Light blue background
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,           // Space below icon
  },

  /**
   * title
   * -----
   * Large bold heading for the screen.
   */
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
  },

  /**
   * subtitle
   * --------
   * Secondary explanatory text.
   */
  subtitle: {
    marginTop: 12,
    fontSize: 16,
    lineHeight: 22,   // Improves multi-line readability
    color: "#6B7280", // Muted gray for less emphasis than title
    textAlign: "center",
    maxWidth: 320,    // Prevents overly wide lines on larger screens
    marginBottom: 24,
  },

  /**
   * button
   * ------
   * Primary CTA styling.
   */
  button: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
  },

  /**
   * buttonText
   * ----------
   * Styling for the CTA label.
   */
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});