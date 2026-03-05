/**
 * Dashboard Screen
 * ================
 * Purpose:
 * - Shows the main dashboard "empty state" when no financial data is present.
 * - Provides CTAs to add a transaction, scan a receipt, or upload a CSV.
 * - Includes a slide-in sidebar (drawer) menu built using Animated.
 *
 * Key UX behaviors:
 * - Header respects safe area (notch/status bar).
 * - Sidebar slides in from the left with a dimmed backdrop behind it.
 * - Backdrop is pressable to close the sidebar.
 */

// React is required for defining functional components and returning JSX.
// useState stores UI state (sidebar open/closed).
// useRef stores a stable Animated.Value instance across renders.
import React, { useRef, useState } from "react";

// Core React Native UI building blocks.
// - View: container for layout
// - Text: displays text
// - StyleSheet: creates optimized styles
// - Pressable: touchable component with press handling
// - Animated: native animations for the sidebar transition
import { View, Text, StyleSheet, Pressable, Animated } from "react-native";

// Ionicons provides the icon set used in the header and empty-state UI.
import { Ionicons } from "@expo/vector-icons";

// expo-router navigation object for programmatic routing between screens.
import { router } from "expo-router";

// SafeAreaView ensures content does not overlap status bar / notches.
// Using react-native-safe-area-context gives better control over edges.
import { SafeAreaView } from "react-native-safe-area-context";

/**
 * dashboardScreen Component
 * ------------------------
 * NOTE: In React, component names are typically PascalCase (DashboardScreen).
 * This function still works, but PascalCase is recommended for conventions and tooling.
 */
export default function dashboardScreen() {
  /**
   * Sidebar configuration.
   * SIDEBAR_WIDTH is used in multiple places:
   * - initial off-screen X position (-SIDEBAR_WIDTH)
   * - slide in to X=0 when opened
   * - interpolate backdrop opacity based on translation progress
   */
  const SIDEBAR_WIDTH = 280;

  /**
   * isSidebarOpen
   * -------------
   * Controls whether the sidebar/backdrop subtree is mounted.
   * - true: render the overlay + animated drawer
   * - false: remove it entirely (no overlay intercepting touches)
   */
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  /**
   * slideAnim
   * ---------
   * Animated.Value that tracks the current translateX of the sidebar.
   * Starts at -SIDEBAR_WIDTH (fully hidden off-screen to the left).
   *
   * useRef ensures the Animated.Value instance persists across re-renders.
   */
  const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;

  /**
   * openSidebar
   * -----------
   * - Mounts the sidebar/backdrop by setting isSidebarOpen = true
   * - Animates the sidebar translateX to 0 (fully visible)
   */
  const openSidebar = () => {
    setIsSidebarOpen(true);

    Animated.timing(slideAnim, {
      toValue: 0,          // end position (fully visible)
      duration: 220,       // animation duration in ms
      useNativeDriver: true, // use native driver for better performance
    }).start();
  };

  /**
   * closeSidebar
   * ------------
   * - Animates sidebar back to -SIDEBAR_WIDTH (off-screen)
   * - Once animation finishes, unmounts overlay by setting isSidebarOpen = false
   *   (prevents invisible overlay from blocking touches)
   */
  const closeSidebar = () => {
    Animated.timing(slideAnim, {
      toValue: -SIDEBAR_WIDTH, // hide position
      duration: 200,
      useNativeDriver: true,
    }).start(({ finished }) => {
      // Only unmount if the animation completed (not interrupted).
      if (finished) setIsSidebarOpen(false);
    });
  };

  /**
   * backdropOpacity
   * ---------------
   * Derives a dimming opacity based on how open the sidebar is.
   * - When sidebar is fully closed (translateX = -SIDEBAR_WIDTH) => opacity 0
   * - When sidebar is open (translateX = 0) => opacity 0.35
   * clamp prevents values outside the range from overshooting.
   */
  const backdropOpacity = slideAnim.interpolate({
    inputRange: [-SIDEBAR_WIDTH, 0],
    outputRange: [0, 0.35],
    extrapolate: "clamp",
  });

  /**
   * openRouteFromSidebar
   * --------------------
   * Helper that:
   * 1) closes sidebar (animate out)
   * 2) navigates to requested route
   *
   * The union type restricts allowed routes to known tab routes.
   */
  const openRouteFromSidebar = (
    path: "/dashboard" | "/transactions" | "/budget" | "/alerts" | "/chat",
  ) => {
    closeSidebar();
    router.push(path);
  };

  return (
    /**
     * SafeAreaView
     * ------------
     * Ensures top UI (header) doesn't render beneath the status bar / notch.
     * edges={["top"]} applies safe area padding only on the top edge.
     */
    <SafeAreaView edges={["top"]} style={styles.safe}>
      {/* ==========================================================
         HEADER
         - Left: menu button (opens sidebar)
         - Center: "Dashboard" title (absolute-centered)
         - Right: placeholders for theme toggle + profile
         ========================================================== */}
      <View style={styles.header}>
        {/* Left side of header */}
        <View style={styles.headerLeft}>
          {/* Optional brand badge (currently commented out) */}
          {/* <View style={styles.mmBadge}>
            <Text style={styles.mmText}>M</Text>
          </View> */}

          {/* Hamburger icon button opens the sidebar drawer */}
          <Pressable
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel="Open menu"
            onPress={openSidebar}
          >
            <Ionicons name="menu-outline" size={24} color="#111827" />
          </Pressable>
        </View>

        {/* Centered title; pointerEvents="none" prevents it from blocking taps */}
        <View style={styles.headerTitleWrap} pointerEvents="none">
          <Text style={styles.headerTitle}>Dashboard</Text>
        </View>

        {/* Right side of header */}
        <View style={styles.headerRight}>
          {/* Theme toggle placeholder (no onPress yet) */}
          <Pressable
            style={styles.iconBtn}
            accessibilityRole="button"
            // accessibilityLabel="Toggle theme"
          >
            <Ionicons name="moon-outline" size={22} color="#111827" />
          </Pressable>

          {/* Profile placeholder (no onPress yet) */}
          <Pressable
            style={styles.iconBtn}
            accessibilityRole="button"
            // accessibilityLabel="Open profile"
          >
            <Ionicons name="person-outline" size={22} color="#111827" />
          </Pressable>
        </View>
      </View>

      {/* Optional divider below the header (currently commented out) */}
      {/* <View style={styles.divider} /> */}

      {/* ==========================================================
         MAIN CONTENT (Empty State)
         - Communicates no data exists yet
         - Offers CTAs to add/import data
         ========================================================== */}
      <View style={styles.content}>
        {/* Icon container for empty state */}
        <View style={styles.emptyIconWrap}>
          <Ionicons name="card-outline" size={50} color="#9CA3AF" />
        </View>

        {/* Headline */}
        <Text style={styles.emptyTitle}>No Financial Data Found</Text>

        {/* Explanation / next steps */}
        <Text style={styles.emptySubtitle}>
          Start by adding a transaction or uploading a file.
        </Text>

        {/* Primary CTA: navigate to /transactions to add a record */}
        <Pressable
          style={styles.primaryBtn}
          accessibilityRole="button"
          onPress={() => router.push("/transactions")}
        >
          <Ionicons name="add" size={22} color="#FFFFFF" />
          <Text style={styles.primaryBtnText}>Add Transaction</Text>
        </Pressable>

        {/* Secondary CTA: navigate to receipt capture flow */}
        <Pressable
          style={styles.scanBtn}
          accessibilityRole="button"
          onPress={() => router.push("/ReceiptCaptureScreen")}
        >
          <Ionicons name="receipt-outline" size={20} color="#111827" />
          <Text style={styles.scanBtnText}>Scan Receipt</Text>
        </Pressable>

        {/* Tertiary CTA: placeholder for future CSV upload */}
        <Pressable
          style={styles.secondaryBtn}
          accessibilityRole="button"
          // TODO: connect to a file picker + import pipeline
        >
          <Ionicons name="cloud-upload-outline" size={20} color="#111827" />
          <Text style={styles.secondaryBtnText}>Upload CSV</Text>
        </Pressable>
      </View>

      {/* ==========================================================
         SIDEBAR OVERLAY (Only mounted when open)
         - Backdrop dims the screen and closes on press
         - Sidebar slides in using Animated translateX
         ========================================================== */}
      {isSidebarOpen && (
        <View style={styles.sidebarContainer} pointerEvents="box-none">
          {/* Backdrop press target: tapping outside closes sidebar */}
          <Pressable onPress={closeSidebar} style={styles.backdropPressable}>
            {/* Animated opacity gives fade-in/out effect tied to slideAnim */}
            <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
          </Pressable>

          {/* Sidebar panel itself */}
          <Animated.View
            style={[
              styles.sidebar,
              {
                width: SIDEBAR_WIDTH, // keep width consistent with animation calculations
                transform: [{ translateX: slideAnim }], // slide in/out
              },
            ]}
          >
            <Text style={styles.sidebarTitle}>Menu</Text>

            {/* Each menu item closes sidebar then navigates to target route */}
            <Pressable
              style={styles.menuItem}
              onPress={() => openRouteFromSidebar("/dashboard")}
            >
              <Ionicons name="grid-outline" size={20} color="#111827" />
              <Text style={styles.menuItemText}>Dashboard</Text>
            </Pressable>

            <Pressable
              style={styles.menuItem}
              onPress={() => openRouteFromSidebar("/transactions")}
            >
              <Ionicons name="receipt-outline" size={20} color="#111827" />
              <Text style={styles.menuItemText}>Transactions</Text>
            </Pressable>

            <Pressable
              style={styles.menuItem}
              onPress={() => openRouteFromSidebar("/budget")}
            >
              <Ionicons name="wallet-outline" size={20} color="#111827" />
              <Text style={styles.menuItemText}>Budget</Text>
            </Pressable>

            <Pressable
              style={styles.menuItem}
              onPress={() => openRouteFromSidebar("/alerts")}
            >
              <Ionicons name="alert-circle-outline" size={20} color="#111827" />
              <Text style={styles.menuItemText}>Alerts</Text>
            </Pressable>

            <Pressable
              style={styles.menuItem}
              onPress={() => openRouteFromSidebar("/chat")}
            >
              <Ionicons name="chatbox-outline" size={20} color="#111827" />
              <Text style={styles.menuItemText}>Chat</Text>
            </Pressable>
          </Animated.View>
        </View>
      )}
    </SafeAreaView>
  );
}

/**
 * Stylesheet for the Dashboard screen.
 * Using StyleSheet.create improves performance and provides validation.
 */
const styles = StyleSheet.create({
  // Root container style applied to SafeAreaView.
  safe: {
    flex: 1, // Fill entire screen height
    backgroundColor: "#FFFFFF",
  },

  /**
   * header
   * ------
   * Uses position:relative so headerTitleWrap can absolute-center the title.
   * NOTE: marginTop:-50 is an aggressive adjustment; consider using insets
   * or adjusting padding instead if you see layout issues across devices.
   */
  header: {
    marginTop: -50,
    paddingHorizontal: 18,
    paddingTop: 2,
    paddingBottom: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    position: "relative",
  },

  // Left section of the header (menu button area).
  headerLeft: {
    minWidth: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },

  // Absolutely centers the title across the full header width.
  headerTitleWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    height: 44,
  },

  // Optional badge (currently unused).
  mmBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },

  // Badge letter styling.
  mmText: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: 0.1,
  },

  // Header title typography.
  headerTitle: {
    fontSize: 23,
    fontWeight: "800",
    color: "#111827",
  },

  // Right section containing action icons.
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  // Shared style for icon-only pressables; padding improves tap target.
  iconBtn: {
    padding: 8,
    borderRadius: 12,
  },

  // Main content container for empty state.
  content: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 50,
  },

  // Background "chip" around the empty-state icon.
  emptyIconWrap: {
    width: 92,
    height: 92,
    borderRadius: 24,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },

  // Empty-state headline.
  emptyTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#111827",
    textAlign: "center",
    marginTop: 6,
  },

  // Empty-state supporting paragraph.
  emptySubtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
    marginTop: 12,
    marginBottom: 28,
    maxWidth: 320,
  },

  // Primary CTA button styling (blue filled).
  primaryBtn: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#2563EB",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },

  // Primary CTA label.
  primaryBtnText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 18,
  },

  // Secondary CTA (light background with border).
  scanBtn: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 14,
  },

  // Secondary CTA label.
  scanBtnText: {
    color: "#111827",
    fontWeight: "800",
    fontSize: 18,
  },

  // Tertiary CTA (white background with subtle border).
  secondaryBtn: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  // Tertiary CTA label.
  secondaryBtnText: {
    color: "#111827",
    fontWeight: "800",
    fontSize: 18,
  },

  // Full-screen overlay container for sidebar + backdrop.
  sidebarContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },

  // Full-screen pressable area used to detect taps outside the sidebar.
  backdropPressable: {
    ...StyleSheet.absoluteFillObject,
  },

  // The dimmed backdrop layer behind the sidebar.
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#111827",
  },

  // Sidebar panel styling (drawer).
  sidebar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "#FFFFFF",
    paddingTop: 80,
    paddingHorizontal: 18,
    borderRightWidth: 1,
    borderRightColor: "#E5E7EB",
  },

  // Sidebar header/title.
  sidebarTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 18,
  },

  // Sidebar menu item row layout.
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },

  // Sidebar menu item label styling.
  menuItemText: {
    fontSize: 17,
    color: "#111827",
    fontWeight: "600",
  },
});