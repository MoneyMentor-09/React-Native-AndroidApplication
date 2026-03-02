import React, { useMemo, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

type TabKey = "dashboard" | "transactions" | "wallet" | "notifications" | "chat";

export default function DashboardScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>("dashboard");

  const tabs = useMemo(
    () =>
      [
        { key: "dashboard", icon: "grid-outline" },
        { key: "transactions", icon: "receipt-outline" },
        { key: "wallet", icon: "wallet-outline" },
        { key: "notifications", icon: "notifications-outline" },
        { key: "chat", icon: "chatbubble-outline" },
      ] as const,
    []
  );

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.mmBadge}>
            <Text style={styles.mmText}>MM</Text>
          </View>
          <Text style={styles.headerTitle}>Dashboard</Text>
        </View>

        <View style={styles.headerRight}>
          <Pressable style={styles.iconBtn} accessibilityRole="button">
            <Ionicons name="moon-outline" size={22} color="#111827" />
          </Pressable>
          <Pressable style={styles.iconBtn} accessibilityRole="button">
            <Ionicons name="menu-outline" size={26} color="#111827" />
          </Pressable>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Empty state body */}
      <View style={styles.content}>
        <View style={styles.emptyIconWrap}>
          <Ionicons name="card-outline" size={44} color="#9CA3AF" />
        </View>

        <Text style={styles.emptyTitle}>No Financial Data Found</Text>
        <Text style={styles.emptySubtitle}>
          Start by adding a transaction or uploading a file.
        </Text>

        <Pressable style={styles.primaryBtn} accessibilityRole="button">
          <Ionicons name="add" size={22} color="#FFFFFF" />
          <Text style={styles.primaryBtnText}>Add Transaction</Text>
        </Pressable>

        <Pressable style={styles.secondaryBtn} accessibilityRole="button">
          <Ionicons name="cloud-upload-outline" size={20} color="#111827" />
          <Text style={styles.secondaryBtnText}>Upload CSV</Text>
        </Pressable>
      </View>

      {/* Bottom tab bar (static UI for now) */}
      <View style={styles.tabBar}>
        {tabs.map((t) => {
          const isActive = t.key === activeTab;
          return (
            <Pressable
              key={t.key}
              onPress={() => setActiveTab(t.key)}
              style={[styles.tabItem, isActive && styles.tabItemActive]}
              accessibilityRole="button"
            >
              <Ionicons
                // Ionicons name type can be picky; cast keeps TS happy
                name={t.icon as any}
                size={24}
                color={isActive ? "#2563EB" : "#6B7280"}
              />
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  header: {
    paddingHorizontal: 18,
    paddingTop: Platform.OS === "android" ? 8 : 6,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  mmBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  mmText: {
    color: "#FFFFFF",
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#111827",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconBtn: {
    padding: 8,
    borderRadius: 12,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#E5E7EB",
  },

  content: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 50,
  },
  emptyIconWrap: {
    width: 92,
    height: 92,
    borderRadius: 24,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  emptyTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#111827",
    textAlign: "center",
    marginTop: 6,
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
    marginTop: 12,
    marginBottom: 28,
    maxWidth: 320,
  },

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
  primaryBtnText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 18,
  },

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
  secondaryBtnText: {
    color: "#111827",
    fontWeight: "800",
    fontSize: 18,
  },

  tabBar: {
    height: 76,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 10,
    paddingBottom: Platform.OS === "ios" ? 16 : 10,
    backgroundColor: "#FFFFFF",
  },
  tabItem: {
    width: 56,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  tabItemActive: {
    backgroundColor: "#EFF6FF",
  },
});
