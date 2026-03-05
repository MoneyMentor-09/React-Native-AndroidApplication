/**
 * Ionicons (Expo Vector Icons)
 * ----------------------------
 * Provides a large library of scalable vector icons that work well across
 * Android and iOS. Here, Ionicons supplies the icons displayed in the
 * bottom tab bar.
 */
import { Ionicons } from "@expo/vector-icons";

/**
 * Tabs (expo-router)
 * ------------------
 * Creates a bottom tab navigator where each <Tabs.Screen> corresponds
 * to a file-based route inside the (tabs) directory.
 */
import { Tabs } from "expo-router";

/**
 * useSafeAreaInsets
 * -----------------
 * Hook that returns the device safe-area insets (top, bottom, left, right).
 * This helps position UI away from areas like:
 * - iPhone home indicator
 * - notches / rounded corners
 * - Android gesture navigation bar
 */
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * TabsLayout
 * ----------
 * Defines the global tab navigation layout used by the app.
 * In expo-router, placing this file in the (tabs) directory (typically as
 * app/(tabs)/_layout.tsx) configures the tab navigator for those routes.
 */
export default function TabsLayout() {
  /**
   * insets.bottom is especially important for tab bars so the buttons
   * do not sit underneath the home indicator / gesture bar.
   */
  const insets = useSafeAreaInsets();

  return (
    /**
     * Tabs acts as the container for all tab screens.
     * The `screenOptions` prop sets defaults applied to every tab screen,
     * unless overridden by that screen’s own `options`.
     */
    <Tabs
      screenOptions={{
        /**
         * headerShown
         * -----------
         * Disables the default top header for all tab screens.
         * Useful when:
         * - screens implement their own custom headers
         * - you want more vertical space
         */
        headerShown: false,

        /**
         * Active / Inactive Colors
         * ------------------------
         * Control the tint color of tab icons and labels.
         */
        tabBarActiveTintColor: "#2563EB",
        tabBarInactiveTintColor: "#6B7280",

        /**
         * tabBarStyle
         * -----------
         * Visual and layout styling for the tab bar container.
         * Key goal: ensure the bar is tall enough and padded enough
         * to remain usable on devices with bottom safe-area insets.
         */
        tabBarStyle: {
          /**
           * Height is increased by the bottom inset so that the content
           * clears the home indicator/gesture bar.
           *
           * Base height = 62
           * Additional height = insets.bottom
           */
          height: 62 + insets.bottom,

          /**
           * Adds some breathing room above icons/labels.
           */
          paddingTop: 8,

          /**
           * Ensures a minimum bottom padding.
           * On devices with a large bottom inset, it uses that inset.
           * Otherwise, it uses at least 10px so the bar doesn't look cramped.
           */
          paddingBottom: Math.max(insets.bottom, 10),

          /**
           * Subtle divider line separating tab bar from the screen content.
           */
          borderTopColor: "#E5E7EB",

          /**
           * Tab bar background color.
           */
          backgroundColor: "#FFFFFF",
        },

        /**
         * tabBarLabelStyle
         * ----------------
         * Typography styling for the text labels under each icon.
         */
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
      }}
    >
      {/*
        DASHBOARD TAB
        -------------
        Route must match a file in this navigator group, e.g.:
        app/(tabs)/dashboard.tsx
      */}
      <Tabs.Screen
        name="dashboard"
        options={{
          /**
           * Title is used as the label under the tab icon by default.
           */
          title: "Dashboard",

          /**
           * tabBarIcon receives { color, size } from the navigator.
           * Those values depend on whether the tab is active/inactive
           * and the platform default sizing rules.
           */
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={size} color={color} />
          ),
        }}
      />

      {/*
        TRANSACTIONS TAB
        ----------------
        Shows transaction history or a list of purchases/income events.
        Expects a matching file:
        app/(tabs)/transactions.tsx
      */}
      <Tabs.Screen
        name="transactions"
        options={{
          title: "Transactions",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="receipt-outline" size={size} color={color} />
          ),
        }}
      />

      {/*
        BUDGET TAB
        ----------
        Budget overview screen (limits, category spending, goals, etc.).
        Expects:
        app/(tabs)/budget.tsx
      */}
      <Tabs.Screen
        name="budget"
        options={{
          title: "Budget",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="wallet-outline" size={size} color={color} />
          ),
        }}
      />

      {/*
        ALERTS TAB
        ----------
        Notifications / budget warnings / reminders.
        Expects:
        app/(tabs)/alerts.tsx
      */}
      <Tabs.Screen
        name="alerts"
        options={{
          title: "Alerts",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="alert-circle-outline" size={size} color={color} />
          ),
        }}
      />

      {/*
        CHAT TAB
        --------
        Conversational assistant / support.
        Expects:
        app/(tabs)/chat.tsx
      */}
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbox-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}