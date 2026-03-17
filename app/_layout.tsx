// expo-router Stack
// -----------------
// Stack is the top-level navigator used to define the app's screen hierarchy.
// Each <Stack.Screen /> represents a route that can be pushed onto the navigation stack.
import { Stack } from "expo-router";

// StatusBar
// ---------
// Controls the appearance of the device status bar.
// Here it is configured with dark content over a transparent background.
import { StatusBar } from "expo-status-bar";

// SafeAreaProvider
// ----------------
// Provides safe area inset values to the entire app so screens can properly
// avoid device notches, status bars, and gesture areas.
import { SafeAreaProvider } from "react-native-safe-area-context";

/**
 * RootLayout
 * ----------
 * This is the top-level layout for the application.
 *
 * Responsibilities:
 * - wraps the app in SafeAreaProvider
 * - configures the global status bar
 * - defines the root navigation stack
 *
 * In expo-router, this layout controls the main navigation structure
 * for all screens nested under the app directory.
 */
export default function RootLayout() {
  return (
    // Makes safe area context available to all child screens and layouts.
    <SafeAreaProvider>
      {/* 
      {/*
        Status bar configuration:
        - style="dark" makes status bar icons/text dark
        - translucent allows content to appear behind the status bar
        - backgroundColor="transparent" removes any visible status bar fill
      */}
      <StatusBar style="dark" translucent backgroundColor="transparent" />

      {/* 
      {/*
        Root stack navigator for the app.
        Screens listed here become part of the top-level navigation flow.
      */}
      <Stack>
        {/* Landing / home entry screen */}
        <Stack.Screen name="index" options={{ headerShown: false }} />

        {/* Login screen with header hidden for a custom full-screen auth layout */}
        <Stack.Screen name="login" options={{ headerShown: false }} />

        {/* Signup screen with header hidden for a custom full-screen auth layout */}
        <Stack.Screen name="signup" options={{ headerShown: false }} />

        {/* 
          Tabs group:
          This points to the nested tab navigator inside the (tabs) folder.
          headerShown is false because the tab layout likely manages its own headers.
        */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        {/* 
        {/*
          Tabs group:
          This points to the nested tab navigator inside the (tabs) folder.
          headerShown is false because the tab layout manages its own headers.
        */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        {/* Profile settings page */}
        <Stack.Screen name="profile" options={{ headerShown: false }} />

        {/* Accessibility settings page */}
        <Stack.Screen name="accessibility" options={{ headerShown: false }} />

        {/* About us page */}
        <Stack.Screen name="about-us" options={{ headerShown: false }} />

        {/*
          Receipt capture screen:
          Uses the default stack header, but overrides the title shown in the header bar.
        */}
        <Stack.Screen
          name="ReceiptCaptureScreen"
          options={{ title: "Receipt Capture" }}
        />
            {/* 
          Receipt capture screen:
          Uses the default stack header, but overrides the title shown in the header bar.
        */}
        <Stack.Screen
          name="ManualTransactionScreen"
          options={{ title: "Manual Transaction" }}
        />

        <Stack.Screen
          name="profile"
          options={{ title: "Profile" }}
        />
      </Stack>

      </Stack>
    </SafeAreaProvider>
  );
}