// Expo Router's Stack navigator
// Provides native-style stack navigation (push, replace, back behavior)
import { Stack } from "expo-router";

/**
 * RootLayout
 * -------------------------------------------------------
 * This is the top-level navigation container for your app.
 * Every screen inside the /app directory is registered here.
 * 
 * Expo Router automatically maps files in /app to routes.
 * This Stack defines how those routes behave visually and navigationally.
 */
export default function RootLayout() {
  return (
    <Stack>

      {/* 
        INDEX SCREEN ("/")
        -------------------------------------------------
        This is your landing/home screen.
        headerShown: false removes the default navigation bar.
        Typically used for marketing or entry screen.
      */}
      <Stack.Screen 
        name="index" 
        options={{ headerShown: false }} 
      />

      {/* 
        LOGIN SCREEN ("/login")
        -------------------------------------------------
        Header hidden to allow fully custom auth UI.
        Prevents default back arrow from appearing.
      */}
      <Stack.Screen 
        name="login" 
        options={{ headerShown: false }} 
      />

      {/* 
        SIGNUP SCREEN ("/signup")
        -------------------------------------------------
        Also hides default header.
        Keeps authentication flow visually consistent.
      */}
      <Stack.Screen 
        name="signup" 
        options={{ headerShown: false }} 
      />

      {/* 
        DASHBOARD SCREEN ("/dashboard")
        -------------------------------------------------
        Main authenticated area.
        Title is shown in native navigation header.
        Since headerShown is not false, it defaults to true.
      */}
      <Stack.Screen 
        name="dashboard" 
        options={{ title: "Dashboard" }} 
      />

      {/* 
        TRANSACTIONS SCREEN ("/transactions")
        -------------------------------------------------
        Secondary authenticated screen.
        Inherits stack behavior:
          - Can navigate back to Dashboard
          - Shows header with provided title
      */}
      <Stack.Screen 
        name="transactions" 
        options={{ title: "Transactions" }} 
      />

    </Stack>
  );
}