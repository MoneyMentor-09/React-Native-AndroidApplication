import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack>
      {/* Landing / onboarding */}
      <Stack.Screen name="index" options={{ headerShown: false }} />

      {/* Auth (if you have these routes) */}
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="signup" options={{ headerShown: false }} />

      {/* Main screens */}
      <Stack.Screen name="dashboard" options={{ headerShown: false }} />
      <Stack.Screen name="transactions" options={{ title: "Transactions" }} />
    </Stack>
  );
}
