/**
 * Stack Navigator (expo-router)
 * -----------------------------
 * The Stack component defines a stack-based navigation structure.
 * Each <Stack.Screen> represents a route that can be pushed or replaced
 * on the navigation stack.
 *
 * Stack navigation works like a stack of pages:
 * - New screens are pushed on top
 * - The back action pops the top screen off the stack
 */
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

/**
 * StyleSheet (React Native)
 * -------------------------
 * Used to create optimized style objects.
 * Styles defined with StyleSheet.create are validated
 * and more performant than inline styles.
 */
import { StyleSheet } from "react-native";

/**
 * Safe Area Components
 * --------------------
 * SafeAreaProvider
 *   Provides context that allows nested components to
 *   correctly detect device safe areas (notches, status bars).
 *
 * SafeAreaView
 *   A container that automatically applies padding so UI
 *   elements do not overlap with system UI areas like:
 *   - iPhone notch
 *   - Android status bar
 *   - gesture navigation bar
 */
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

/**
 * RootLayout Component
 * --------------------
 * This is the root navigation layout for the entire application.
 * In expo-router, the root layout defines:
 * - global navigation structure
 * - top-level providers (SafeAreaProvider, ThemeProvider, etc.)
 */
export default function RootLayout() {
  return (
    /**
     * SafeAreaProvider wraps the entire application.
     * This allows SafeAreaView and other components
     * to access safe area inset information.
     */
    <SafeAreaProvider>

      {/*
        SafeAreaView ensures that the top of the UI does not
        overlap with the device status bar or notch.
        edges={["top"]} applies padding only to the top edge.
      */}
      <SafeAreaView style={styles.root} edges={["top"]}>
        {/* Force dark status-bar icons globally so tray icons remain visible on light/white backgrounds. */}
        <StatusBar style="dark" translucent backgroundColor="transparent" />

        {/*
          Stack Navigator
          ---------------
          Contains all primary routes of the application.
          Each Stack.Screen corresponds to a route file
          inside the app directory.
        */}
        <Stack>

          {/*
            Landing / Onboarding Screen
            ---------------------------
            This is the entry point of the application.
            The "index" route usually corresponds to app/index.tsx.
            headerShown: false removes the default navigation header.
          */}
          <Stack.Screen
            name="index"
            options={{ headerShown: false }}
          />

          {/*
            Authentication Screens
            ----------------------
            Login and Signup routes for user authentication.
            The header is hidden because these screens typically
            use custom UI layouts instead of the default header.
          */}
          <Stack.Screen
            name="login"
            options={{ headerShown: false }}
          />

          <Stack.Screen
            name="signup"
            options={{ headerShown: false }}
          />

          {/*
            Main Application Tabs
            ---------------------
            "(tabs)" refers to a folder containing tab-based navigation.
            For example: app/(tabs)/dashboard.tsx, transactions.tsx, etc.
            headerShown: false prevents the stack header from appearing
            above the tab navigator.
          */}
          <Stack.Screen
            name="(tabs)"
            options={{ headerShown: false }}
          />

          {/*
            Receipt Capture Screen
            ----------------------
            Screen used for capturing or uploading receipts.
            Unlike the other routes, this screen displays a
            navigation header with the title "Receipt Capture".
          */}
          <Stack.Screen
            name="ReceiptCaptureScreen"
            options={{ title: "Receipt Capture" }}
          />

        </Stack>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

/**
 * Styles
 * ------
 * Global layout styling for the root container.
 */
const styles = StyleSheet.create({

  /**
   * root
   * ----
   * Main wrapper for the entire application UI.
   */
  root: {
    flex: 1,                     // Fill the entire screen
    backgroundColor: "#FFFFFF",  // White background for consistent UI
  },

});
