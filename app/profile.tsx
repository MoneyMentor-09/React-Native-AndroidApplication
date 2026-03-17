import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

/**
 * ProfileSettingRowProps
 * ----------------------
 * Reusable row component props for each account information card.
 */
type ProfileSettingRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
};

/**
 * ProfileSettingRow
 * -----------------
 * Reusable card used for username, email, password, and phone number.
 */
function ProfileSettingRow({
  icon,
  label,
  value,
}: ProfileSettingRowProps) {
  return (
    <View style={styles.infoCard}>
      <View style={styles.infoIconWrap}>
        <Ionicons name={icon} size={30} color="#2563EB" />
      </View>

      <View style={styles.infoTextWrap}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>

      <Pressable style={styles.editButton}>
        <Text style={styles.editButtonText}>Edit</Text>
      </Pressable>
    </View>
  );
}

/**
 * ProfileScreen
 * -------------
 * Displays the user's profile settings page.
 * This first version focuses on matching the mockup layout.
 * Real data loading and edit functionality can be connected later.
 */
export default function ProfileScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.root}>
        {/* Top header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={34} color="#475569" />
          </Pressable>

          <Text style={styles.headerTitle}>Profile Settings</Text>

          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* User summary card */}
          <View style={styles.profileCard}>
            <View style={styles.profileAvatar}>
              <Ionicons name="person-outline" size={72} color="#FFFFFF" />
            </View>

            <Text style={styles.profileName}>JohnDoe</Text>
            <Text style={styles.profileSubtitle}>Money Mentor User</Text>
          </View>

          {/* Account information section */}
          <Text style={styles.sectionTitle}>ACCOUNT INFORMATION</Text>

          <ProfileSettingRow
            icon="person-outline"
            label="Username"
            value="JohnDoe"
          />

          <ProfileSettingRow
            icon="mail-outline"
            label="Email Address"
            value="john.doe@e..."
          />

          <ProfileSettingRow
            icon="lock-closed-outline"
            label="Password"
            value="••••••••"
          />

          <ProfileSettingRow
            icon="call-outline"
            label="Phone Number"
            value="+1 (555) ..."
          />

          {/* Logout button */}
          <Pressable
            style={styles.logoutButton}
            onPress={() => router.replace("/login")}
          >
            <Ionicons name="log-out-outline" size={28} color="#FFFFFF" />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </Pressable>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  root: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#D1D5DB",
    backgroundColor: "#F8FAFC",
  },

  backButton: {
    padding: 4,
  },

  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
  },

  headerSpacer: {
    width: 38,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
  },

  profileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    alignItems: "center",
    paddingVertical: 26,
    paddingHorizontal: 20,
    marginBottom: 28,
  },

  profileAvatar: {
    width: 188,
    height: 188,
    borderRadius: 94,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#7C3AED",
    marginBottom: 22,
  },

  profileName: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
  },

  profileSubtitle: {
    fontSize: 18,
    color: "#556070",
    fontWeight: "500",
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#475569",
    letterSpacing: 0.6,
    marginBottom: 18,
  },

  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    paddingHorizontal: 20,
    paddingVertical: 22,
    marginBottom: 18,
  },

  infoIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },

  infoTextWrap: {
    flex: 1,
  },

  infoLabel: {
    fontSize: 17,
    color: "#556070",
    fontWeight: "500",
    marginBottom: 8,
  },

  infoValue: {
    fontSize: 22,
    color: "#111827",
    fontWeight: "700",
  },

  editButton: {
    backgroundColor: "#E8EEF8",
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 18,
    marginLeft: 10,
  },

  editButtonText: {
    color: "#2563EB",
    fontSize: 17,
    fontWeight: "700",
  },

  logoutButton: {
    marginTop: 14,
    backgroundColor: "#FF0000",
    borderRadius: 18,
    height: 62,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  logoutButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
});
