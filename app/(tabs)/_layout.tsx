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
// useRouter      → programmatic navigation API (similar to navigation.push())
// usePathname → returns the current route path ("/dashboard", "/transactions", etc.)
import { Tabs, useRouter, usePathname } from "expo-router";

// React Native imports
// --------------------
// Animated   → performant animation API used to slide the sidebar
// Pressable  → component for touchable UI elements with press feedback
// StyleSheet → optimized way to define component styles
// Text/View  → core layout and text primitives
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

// Safe area hook
// --------------
// Devices with notches or gesture bars require extra spacing so UI
// does not overlap the system interface (status bar, home bar).
// useSafeAreaInsets returns top/bottom/left/right padding values.
import { useSafeAreaInsets } from "react-native-safe-area-context";

import HelpChatWidget from "../../components/HelpChatWidget";

const SIDEBAR_WIDTH = 280;

type SidebarRoute = {
  path: "/dashboard" | "/transactions" | "/budget" | "/alerts" | "/chat";
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const SIDEBAR_ROUTES: SidebarRoute[] = [
  { path: "/dashboard", label: "Dashboard", icon: "grid-outline" },
  { path: "/transactions", label: "Transactions", icon: "receipt-outline" },
  { path: "/budget", label: "Budget", icon: "wallet-outline" },
  { path: "/alerts", label: "Alerts", icon: "alert-circle-outline" },
  // { path: "/chat", label: "Chat", icon: "chatbox-outline" },
];

const HEADER_TITLES: Record<string, string> = {
  dashboard: "Dashboard",
  transactions: "Transactions",
  budget: "Budget",
  alerts: "Alerts",
  chat: "Chat",
};

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;

  const currentSegment =
    pathname.split("/").filter(Boolean).at(-1) ?? "dashboard";

  const currentTitle = HEADER_TITLES[currentSegment] ?? "MoneyMap";

  const openSidebar = () => {
    setIsSidebarOpen(true);

    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const closeSidebar = () => {
    Animated.timing(slideAnim, {
      toValue: -SIDEBAR_WIDTH,
      duration: 200,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setIsSidebarOpen(false);
    });
  };

  const contentTranslateX = slideAnim.interpolate({
    inputRange: [-SIDEBAR_WIDTH, 0],
    outputRange: [0, SIDEBAR_WIDTH],
    extrapolate: "clamp",
  });

  const contentScrimOpacity = slideAnim.interpolate({
    inputRange: [-SIDEBAR_WIDTH, 0],
    outputRange: [0, 0.08],
    extrapolate: "clamp",
  });

  const router = useRouter();

  const openRouteFromSidebar = (path: SidebarRoute["path"]) => {
    closeSidebar();
    router.push(path);
  };

  return (
    <View style={styles.root}>
      <Animated.View
        pointerEvents={isSidebarOpen ? "auto" : "none"}
        style={[
          styles.sidebar,
          {
            width: SIDEBAR_WIDTH,
            paddingTop: insets.top + 24,
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        <Text style={styles.sidebarTitle}>Menu</Text>

        {SIDEBAR_ROUTES.map((route) => (
          <Pressable
            key={route.path}
            style={styles.menuItem}
            onPress={() => openRouteFromSidebar(route.path)}
          >
            <Ionicons name={route.icon} size={20} color="#111827" />
            <Text style={styles.menuItemText}>{route.label}</Text>
          </Pressable>
        ))}
      </Animated.View>

      <Animated.View
        style={[
          styles.content,
          {
            transform: [{ translateX: contentTranslateX }],
          },
        ]}
      >
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
            headerLeft: () => (
              <Pressable
                style={styles.iconBtn}
                accessibilityRole="button"
                accessibilityLabel="Open menu"
                onPress={openSidebar}
              >
                <Ionicons name="settings-outline" size={24} color="#111827" />
              </Pressable>
            ),
            headerRight: () => (
              <Pressable
                onPress={() => router.push("/profile")}
                style={{ paddingRight: 16, paddingVertical: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Go to Profile"
              >
                <Ionicons
                  name="person-circle-outline"
                  size={28}
                  color="#111827"
                />
              </Pressable>
            ),
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
          <Tabs.Screen
            name="dashboard"
            options={{
              title: "Dashboard",
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="grid-outline" size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="transactions"
            options={{
              title: "Transactions",
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="receipt-outline" size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="budget"
            options={{
              title: "Budget",
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="wallet-outline" size={size} color={color} />
              ),
            }}
          />
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
          <Tabs.Screen
            name="chat"
            options={{
              href: null,
              title: "Chat",
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="chatbox-outline" size={size} color={color} />
              ),
            }}
          />
        </Tabs>

        {isSidebarOpen && (
          <Pressable onPress={closeSidebar} style={styles.contentDismissArea}>
            <Animated.View
              style={[styles.contentScrim, { opacity: contentScrimOpacity }]}
            />
          </Pressable>
        )}

        <HelpChatWidget />
      </Animated.View>
    </View>
  );
}

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
