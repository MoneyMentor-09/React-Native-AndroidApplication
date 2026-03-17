import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

/**
 * TEAM_MEMBERS
 * ------------
 * List of development team members displayed on the About Us page.
 */
const TEAM_MEMBERS = [
  "John Enzo Vitale",
  "Amrinder Singh",
  "Samuel Sexton",
  "Chijioke William Okogwu",
  "Nick Sikorski",
];

/**
 * AboutUsScreen
 * -------------
 * Displays project information and the development team list.
 */
export default function AboutUsScreen() {
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

          <View style={styles.headerTitleRow}>
            <Ionicons name="information-circle-outline" size={34} color="#2563EB" />
            <Text style={styles.headerTitle}>About Us</Text>
          </View>

          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Project description card */}
          <View style={styles.infoCard}>
            <View style={styles.cardTitleRow}>
              <View style={[styles.cardIconWrap, styles.blueIconWrap]}>
                <Ionicons name="code-slash-outline" size={34} color="#2563EB" />
              </View>

              <Text style={styles.cardTitle}>Money Mentor</Text>
            </View>

            <Text style={styles.descriptionText}>
              A comprehensive financial management app developed as a Software
              Engineering project over two semesters, empowering users with
              budgeting, transaction tracking, and AI-powered financial guidance.
            </Text>
          </View>

          {/* Team card */}
          <View style={styles.infoCard}>
            <View style={styles.cardTitleRow}>
              <View style={[styles.cardIconWrap, styles.greenIconWrap]}>
                <Ionicons name="people-outline" size={34} color="#16A34A" />
              </View>

              <Text style={styles.cardTitle}>Development Team</Text>
            </View>

            <View style={styles.teamList}>
              {TEAM_MEMBERS.map((member) => (
                <View key={member} style={styles.teamMemberCard}>
                  <Text style={styles.teamMemberText}>{member}</Text>
                </View>
              ))}
            </View>
          </View>

          <Text style={styles.footerText}>
            Thank you for exploring our project!
          </Text>
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

  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
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
    paddingTop: 16,
    paddingBottom: 28,
  },

  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginBottom: 20,
  },

  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 22,
  },

  cardIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },

  blueIconWrap: {
    backgroundColor: "#DBEAFE",
  },

  greenIconWrap: {
    backgroundColor: "#DCFCE7",
  },

  cardTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
  },

  descriptionText: {
    fontSize: 18,
    lineHeight: 28,
    color: "#556070",
  },

  teamList: {
    gap: 16,
  },

  teamMemberCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    paddingVertical: 22,
    paddingHorizontal: 18,
  },

  teamMemberText: {
    fontSize: 18,
    color: "#111827",
    fontWeight: "500",
  },

  footerText: {
    textAlign: "center",
    color: "#667085",
    fontSize: 16,
    marginTop: 10,
  },
});
