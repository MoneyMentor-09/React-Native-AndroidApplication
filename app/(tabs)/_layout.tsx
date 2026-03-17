// React imports
// -------------
// React must be imported because JSX is used in this component.
// useRef   → stores persistent mutable values that do NOT trigger re-renders.
// useState → manages component state (e.g., whether the sidebar is open).
import React, { useRef, useState } from "react";

// Ionicons
// --------
// Icon library bundled with Expo that provides a large set of vector icons.
// Used throughout the layout for:
// • Bottom tab bar icons
// • Sidebar menu icons
// • Header action icons
import { Ionicons } from "@expo/vector-icons";

// expo-router imports
// -------------------
// Tabs        → creates the bottom tab navigation container
// router      → programmatic navigation API (similar to navigation.push())
// usePathname → returns the current route path ("/dashboard", "/transactions", etc.)
import { Tabs, router, usePathname } from "expo-router";

// React Native imports
// --------------------
// Animated   → performant animation API used to slide the sidebar
// Pressable  → component for touchable UI elements with press feedback
// StyleSheet → optimized way to define component styles
// Text/View  → core layout and text primitives
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

import { useRouter } from "expo-router";

// Safe area hook
// --------------
// Devices with notches or gesture bars require extra spacing so UI
// does not overlap the system interface (status bar, home bar).
// useSafeAreaInsets returns top/bottom/left/right padding values.
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Sidebar width constant
// ----------------------
// Defines the fixed width of the sidebar drawer.
// This value is reused for:
// • animation start/end positions
// • content translation distance
// Keeping it centralized ensures layout consistency.
const SIDEBAR_WIDTH = 280;

// SidebarRoute type
// -----------------
// TypeScript structure describing each sidebar item.
//
// path  → route path used for navigation
// label → text shown in the sidebar
// icon  → icon name from Ionicons.glyphMap
//
// Restricting paths prevents accidental navigation to invalid routes.
type SidebarRoute = {
  path: "/dashboard" | "/transactions" | "/budget" | "/alerts" | "/chat";
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
// path      → route path used for navigation
// label     → text shown in the sidebar
// icon      → icon name from Ionicons.glyphMap
// iconColor → icon color for visual distinction between items
//
// Restricting paths prevents accidental navigation to invalid routes.
type SidebarRoute = {
  path: "/profile" | "/accessibility" | "/about-us" | "/login";
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
};

// Sidebar routes
// --------------
// Centralized configuration array describing all sidebar menu items.
// Benefits:
// • avoids repeating JSX markup
// • ensures navigation paths stay consistent
// • makes the sidebar easily extendable
const SIDEBAR_ROUTES: SidebarRoute[] = [
  { path: "/dashboard", label: "Dashboard", icon: "grid-outline" },
  { path: "/transactions", label: "Transactions", icon: "receipt-outline" },
  { path: "/budget", label: "Budget", icon: "wallet-outline" },
  { path: "/alerts", label: "Alerts", icon: "alert-circle-outline" },
  { path: "/chat", label: "Chat", icon: "chatbox-outline" },
// This sidebar now acts as a profile / settings drawer opened from
// the top-right profile icon in the header.
const SIDEBAR_ROUTES: SidebarRoute[] = [
  {
    path: "/profile",
    label: "Profile",
    icon: "person-outline",
    iconColor: "#2563EB",
  },
  {
    path: "/accessibility",
    label: "Accessibility",
    icon: "settings-outline",
    iconColor: "#9333EA",
  },
  {
    path: "/about-us",
    label: "About Us",
    icon: "information-circle-outline",
    iconColor: "#16A34A",
  },
  {
    path: "/login",
    label: "Logout",
    icon: "log-out-outline",
    iconColor: "#DC2626",
  },
];

// Header titles map
// -----------------
// Maps route segments to the title shown in the header.
// Example:
// /dashboard     → Dashboard
// /transactions  → Transactions
//
// Using a map keeps title logic centralized instead of hardcoding
// titles inside each screen configuration.
const HEADER_TITLES: Record<string, string> = {
  dashboard: "Dashboard",
  transactions: "Transactions",
  budget: "Budget",
  alerts: "Alerts",
  chat: "Chat",
};

/**
 * TabsLayout Component
 * --------------------
 * This layout wraps the main application screens.
 *
 * Responsibilities:
 * 1. Define the bottom tab navigator
 * 2. Provide a shared header configuration
 * 3. Implement a push-style animated sidebar
 * 4. Handle route-based header titles
 *
 * In expo-router, a _layout.tsx file controls navigation structure.
 */
export default function TabsLayout() {
  // Safe area values for the device.
  // Example values:
  // iPhone with notch → top ≈ 44
  // Android gesture nav → bottom ≈ 16–30
  const insets = useSafeAreaInsets();

  // Current pathname returned by expo-router.
  // Example values:
  // "/dashboard"
  // "/transactions"
  // "/budget"
  const pathname = usePathname();

  // React state tracking whether the sidebar is open.
  // Used to:
  // • enable/disable pointer events
  // • render the dismiss overlay
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Animated value controlling sidebar horizontal position.
  //
  // Initial value:
  // -SIDEBAR_WIDTH
  //
  // This places the sidebar completely off-screen to the left.
  const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;

  // Extract the last segment of the route path.
  //
  // Example:
  // "/transactions" → ["transactions"] → "transactions"
  // "/dashboard" → ["dashboard"] → "dashboard"
  //
  // filter(Boolean) removes empty strings from splitting.
  const currentSegment =
    pathname.split("/").filter(Boolean).at(-1) ?? "dashboard";

  // Determine the header title from the route map.
  // If a route is not found, fallback title is "MoneyMap".
  const currentTitle = HEADER_TITLES[currentSegment] ?? "MoneyMap";

  /**
   * openSidebar()
   * -------------
   * Opens the sidebar drawer using an animated slide transition.
   *
   * Steps:
   * 1. Set state to open
   * 2. Animate translateX from -SIDEBAR_WIDTH → 0
   */
  const openSidebar = () => {
    setIsSidebarOpen(true);

    Animated.timing(slideAnim, {
      toValue: 0, // sidebar fully visible
      duration: 200, // quick UI animation
      useNativeDriver: true, // offloads animation to native thread
    }).start();
  };

  /**
   * closeSidebar()
   * --------------
   * Closes the sidebar by reversing the animation.
   *
   * translateX moves from 0 → -SIDEBAR_WIDTH.
   * When animation completes we update state.
   */
  const closeSidebar = () => {
    Animated.timing(slideAnim, {
      toValue: -SIDEBAR_WIDTH,
      duration: 200,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setIsSidebarOpen(false);
    });
  };

  /**
   * contentTranslateX
   * -----------------
   * Interpolated animated value that shifts the page content.
   *
   * When sidebar moves:
   * -280 → 0
   *
   * Content moves:
   * 0 → +280
   *
   * This creates a **push drawer effect** rather than overlay.
   * This creates a push drawer effect rather than overlay.
   */
  const contentTranslateX = slideAnim.interpolate({
    inputRange: [-SIDEBAR_WIDTH, 0],
    outputRange: [0, SIDEBAR_WIDTH],
    extrapolate: "clamp",
  });

  /**
   * contentScrimOpacity
   * -------------------
   * Controls opacity of the dark overlay behind the drawer.
   *
   * Purpose:
   * • visually indicate the page is inactive
   * • allow tapping outside the drawer to close it
   */
  const contentScrimOpacity = slideAnim.interpolate({
    inputRange: [-SIDEBAR_WIDTH, 0],
    outputRange: [0, 0.08],
    extrapolate: "clamp",
  });

  const router = useRouter(); // already imported

  /**
   * openRouteFromSidebar()
   * ----------------------
   * Navigates to a selected route from the sidebar.
   *
   * Steps:
   * 1. Close sidebar
   * 2. Push new route using expo-router
   */
  const openRouteFromSidebar = (path: SidebarRoute["path"]) => {
    closeSidebar();
    router.push(path);
  };

  return (
    // Root container wrapping sidebar and animated content
    <View style={styles.root}>
      {/* Sidebar drawer */}
      <Animated.View
        pointerEvents={isSidebarOpen ? "auto" : "none"}
        style={[
          styles.sidebar,
          {
            width: SIDEBAR_WIDTH,
            paddingTop: insets.top + 24,
            paddingTop: insets.top + 20,
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        {/* Sidebar header */}
        <Text style={styles.sidebarTitle}>Menu</Text>
        <View style={styles.sidebarHeader}>
          <View style={styles.sidebarBrandRow}>
            <View style={styles.brandBadge}>
              <Text style={styles.brandBadgeText}>MM</Text>
            </View>
            <Text style={styles.sidebarTitle}>{currentTitle}</Text>
          </View>

          <Pressable
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel="Close menu"
            onPress={closeSidebar}
          >
            <Ionicons name="close" size={30} color="#374151" />
          </Pressable>
        </View>

        {/* Render sidebar menu items */}
        {SIDEBAR_ROUTES.map((route) => (
          <Pressable
            key={route.path}
            style={styles.menuItem}
            onPress={() => openRouteFromSidebar(route.path)}
          >
            <Ionicons name={route.icon} size={20} color="#111827" />
            <Ionicons name={route.icon} size={28} color={route.iconColor} />
            <Text style={styles.menuItemText}>{route.label}</Text>
          </Pressable>
        ))}
      </Animated.View>

      {/* Animated page container */}
      <Animated.View
        style={[
          styles.content,
          {
            transform: [{ translateX: contentTranslateX }],
          },
        ]}
      >
        {/* Bottom Tab Navigator */}
        <Tabs
          screenOptions={{
            headerShown: true,
            tabBarActiveTintColor: "#2563EB",
            tabBarInactiveTintColor: "#6B7280",

            headerStyle: {
              backgroundColor: "#ffffff00",
            },

            headerShadowVisible: false,

            headerTitleStyle: {
              fontSize: 23,
              fontWeight: "800",
              color: "#111827",
            },

            headerTitleAlign: "center",

            headerTitle: currentTitle,

            /**
             * headerLeft
             * ----------
             * Settings/menu button that opens the sidebar.
             * Existing settings/menu button on the left side of the header.
             * This stays in place and can still be used for future settings logic
             * or other features if desired.
             */
            headerLeft: () => (
              <Pressable
                style={styles.iconBtn}
                accessibilityRole="button"
                accessibilityLabel="Open menu"
                onPress={openSidebar}
                accessibilityLabel="Open settings"
              >
                <Ionicons name="settings-outline" size={24} color="#111827" />
              </Pressable>
            ),

            /**
             * headerRight
             * -----------
             * Placeholder view used to keep the title centered.
             * Without this, the title would shift slightly left.
             */
            headerRight: () => (
              <Pressable
                onPress={() => router.push("/profile")}
                style={{ paddingRight: 16, paddingVertical: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Go to Profile"
              >
                <Ionicons name="person-circle-outline" size={28} color="#111827" />
             * Profile button that opens the sidebar drawer.
             * This replaces the old 3-line style trigger.
             */
            headerRight: () => (
              <Pressable
                style={styles.iconBtn}
                accessibilityRole="button"
                accessibilityLabel="Open profile menu"
                onPress={openSidebar}
              >
                <Ionicons name="person-outline" size={24} color="#475569" />
              </Pressable>
            ),

            /**
             * Tab bar styling
             * ---------------
             * Height includes bottom safe area so icons
             * are not obstructed by gesture navigation.
             */
            tabBarStyle: {
              height: 62 + insets.bottom,
              paddingTop: 8,
              paddingBottom: Math.max(insets.bottom, 10),
              borderTopColor: "#E5E7EB",
              backgroundColor: "#FFFFFF",
            },

            tabBarLabelStyle: {
              fontSize: 12,
              fontWeight: "600",
            },
          }}
        >
          {/* Dashboard tab */}
          <Tabs.Screen
            name="dashboard"
            options={{
              title: "Dashboard",
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="grid-outline" size={size} color={color} />
              ),
            }}
          />

          {/* Transactions tab */}
          <Tabs.Screen
            name="transactions"
            options={{
              title: "Transactions",
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="receipt-outline" size={size} color={color} />
              ),
            }}
          />

          {/* Budget tab */}
          <Tabs.Screen
            name="budget"
            options={{
              title: "Budget",
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="wallet-outline" size={size} color={color} />
              ),
            }}
          />

          {/* Alerts tab */}
          <Tabs.Screen
            name="alerts"
            options={{
              title: "Alerts",
              tabBarIcon: ({ color, size }) => (
                <Ionicons
                  name="alert-circle-outline"
                  size={size}
                  color={color}
                />
              ),
            }}
          />

          {/* Chat tab */}
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

        {/* Overlay used to close sidebar when tapping outside */}
        {isSidebarOpen && (
          <Pressable onPress={closeSidebar} style={styles.contentDismissArea}>
            <Animated.View
              style={[styles.contentScrim, { opacity: contentScrimOpacity }]}
            />
          </Pressable>
        )}
      </Animated.View>
    </View>
  );
}

/**
 * Stylesheet
 * ----------
 * Centralized styling for layout components.
 * StyleSheet.create optimizes styles for React Native rendering.
 */
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },

  headerRightPlaceholder: {
    width: 40,
  },

  iconBtn: {
    padding: 19,
    borderRadius: 12,
  },

  sidebar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 10,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 19,
    backgroundColor: "#F8FAFC",
    borderRightWidth: 1,
    borderRightColor: "#E5E7EB",
  },

  content: {
    flex: 1,
    zIndex: 20,
    backgroundColor: "#FFFFFF",
  },

  contentDismissArea: {
    ...StyleSheet.absoluteFillObject,
  },

  contentScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#111827",
  },

  sidebarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#D1D5DB",
    backgroundColor: "#F8FAFC",
  },

  sidebarBrandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },

  brandBadge: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },

  brandBadgeText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },

  closeBtn: {
    padding: 6,
    borderRadius: 12,
  },

  sidebarTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 18,
  },

  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },

  menuItemText: {
    fontSize: 17,
    color: "#111827",
    fontWeight: "600",
  },
});
    gap: 18,
    paddingHorizontal: 24,
    paddingVertical: 26,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    backgroundColor: "#F8FAFC",
  },

  menuItemText: {
    fontSize: 18,
    color: "#111827",
    fontWeight: "500",
  },
});
