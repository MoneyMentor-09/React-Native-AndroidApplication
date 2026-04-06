import React, { useState, useEffect } from "react";
import { 
  View, Text, StyleSheet, ScrollView, TextInput, Pressable, ActivityIndicator, Image 
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getSupabaseBrowserClient } from "../lib/supabase/client";
import Toast from "react-native-toast-message";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";

type Profile = {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  created_at: string;
  avatar_url?: string;
};

export default function ProfileScreen() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isPasswordMode, setIsPasswordMode] = useState(false);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [editForm, setEditForm] = useState({ full_name: "", phone: "" });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [isLogoutMode, setIsLogoutMode] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUser(user);

      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      const finalProfile = profileData || {
        id: user.id,
        full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
        email: user.email || "",
        phone: user.phone || "",
        created_at: user.created_at,
      };

      setProfile(finalProfile);
      setEditForm({ full_name: finalProfile.full_name, phone: finalProfile.phone || "" });

    } catch (err) {
      console.error("Fetch profile error:", err);
      Toast.show({ type: "error", text1: "Failed to fetch profile" });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      // Update profile table
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          full_name: editForm.full_name,
          phone: editForm.phone || null,
          email: user.email,
        });
      if (profileError) throw profileError;

      // Update user metadata
      const { error: userError } = await supabase.auth.updateUser({
        data: { full_name: editForm.full_name, phone: editForm.phone }
      });
      if (userError) throw userError;

      Toast.show({ type: "success", text1: "Profile updated successfully" });
      setIsEditMode(false);
      fetchProfile();

    } catch (err) {
      console.error("Update profile error:", err);
      Toast.show({ type: "error", text1: "Failed to update profile" });
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      Toast.show({ type: "error", text1: "New passwords do not match" });
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      Toast.show({ type: "error", text1: "Password must be at least 8 characters" });
      return;
    }

    try {
      const supabase = getSupabaseBrowserClient();
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: passwordForm.currentPassword
      });
      if (verifyError) {
        Toast.show({ type: "error", text1: "Current password is incorrect" });
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: passwordForm.newPassword });
      if (error) throw error;

      Toast.show({ type: "success", text1: "Password updated successfully" });
      setIsPasswordMode(false);
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });

    } catch (err) {
      console.error("Change password error:", err);
      Toast.show({ type: "error", text1: "Failed to update password" });
    }
  };

const handleDeleteAccount = async () => {
  try {
    const supabase = getSupabaseBrowserClient();
    await supabase.from("profiles").delete().eq("id", user.id);
    await supabase.from("transactions").delete().eq("user_id", user.id);
    await supabase.from("budgets").delete().eq("user_id", user.id);
    await supabase.from("alerts").delete().eq("user_id", user.id);

    const { error } = await supabase.auth.admin.deleteUser(user.id);
    if (error) throw error;

    Toast.show({ type: "success", text1: "Account deleted successfully" });
    setIsDeleteMode(false); // ✅ Close modal
    // Navigate to login screen
  } catch (err) {
    console.error("Delete account error:", err);
    Toast.show({ type: "error", text1: "Failed to delete account" });
  }
};

const pickImage = async () => {
  const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permissionResult.granted) {
    Toast.show({ type: "error", text1: "Permission denied" });
    return;
  }

 const result = await ImagePicker.launchImageLibraryAsync({
  mediaTypes: ["images"],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.7,
});

  if (!result.canceled && result.assets?.[0].uri) {
    const uri = result.assets[0].uri;
    setProfilePicture(uri);
    uploadProfilePicture(uri);
  }
};

const uploadProfilePicture = async (uri: string) => {
  try {
    const supabase = getSupabaseBrowserClient();

    const response = await fetch(uri);
    const arrayBuffer = await response.arrayBuffer();

    const fileName = `${user.id}.png`;

    const { error } = await supabase.storage
      .from("profile-pictures")
      .upload(fileName, arrayBuffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (error) throw error;

    const { data: publicUrlData } = supabase.storage
      .from("profile-pictures")
      .getPublicUrl(fileName);

    const publicUrl = publicUrlData.publicUrl;

    const newAvatarUrl = `${publicUrl}?t=${Date.now()}`;

    await supabase
      .from("profiles")
      .update({
        avatar_url: newAvatarUrl
      })
      .eq("id", user.id);

    setProfile((prev: any) => ({
      ...prev,
      avatar_url: newAvatarUrl,
    }));

    Toast.show({
      type: "success",
      text1: "Profile picture updated",
    });

  } catch (err) {
    console.error("Upload profile picture error:", err);
    Toast.show({
      type: "error",
      text1: "Failed to upload profile picture",
    });
  }
};

const deleteProfilePicture = async () => {
  try {
    const supabase = getSupabaseBrowserClient();

    const fileName = `${user.id}.png`;

    const { error } = await supabase.storage
      .from("profile-pictures")
      .remove([fileName]);

    if (error) throw error;

    await supabase
      .from("profiles")
      .update({ avatar_url: null })
      .eq("id", user.id);

    setProfile((prev: any) => ({
      ...prev,
      avatar_url: null,
    }));

    Toast.show({ type: "success", text1: "Profile picture removed" });

  } catch (err) {
    console.error("Delete profile picture error:", err);
    Toast.show({ type: "error", text1: "Failed to delete profile picture" });
  }
};

const handleLogout = async () => {
  try {
    
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    Toast.show({ type: "success", text1: "Logged out successfully" });
    setIsLogoutMode(false);
    setLoggingOut(false);

    // Navigate to login screen
    router.replace("/login"); // replace to prevent going back to profile
  } catch (err) {
    console.error("Logout error:", err);
    Toast.show({ type: "error", text1: "Failed to logout" });
  }
};

if (loading) {
    return (
      <View style={[styles.container, styles.centerState]}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={{ marginTop: 12, color: "#6B7280" }}>Loading profile...</Text>
      </View>
    );
  }

  

  return (
    <ScrollView style={styles.container}>

      <View style={{ alignItems: "center", marginBottom: 16 }}>

  {/* Avatar / Change Picture */}
  <Pressable onPress={pickImage}>
    {profile?.avatar_url ? (
      <Image
          key={profile.avatar_url}
          source={{ uri: profile.avatar_url }}
          style={{ width: 100, height: 100, borderRadius: 50 }}
      />
    ) : (
      <Ionicons name="person-circle-sharp" size={100} color="#9CA3AF" />
    )}

    <Ionicons
      name="camera-outline"
      size={24}
      color="#2563EB"
      style={{
        position: "absolute",
        bottom: 0,
        right: 0,
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 2,
      }}
    />
  </Pressable>

  {/* Buttons */}
  <View style={{ flexDirection: "row", marginTop: 8, gap: 12 }}>
    {/* Change Photo Button */}
    <Pressable
      onPress={pickImage}
      style={{
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: "#2563EB",
        borderRadius: 12,
        backgroundColor: "#fff",
      }}
    >
      <Text style={{ color: "#2563EB", fontWeight: "600" }}>Change Photo</Text>
    </Pressable>

    {/* Remove Photo Button */}
    {profile?.avatar_url && (
      <Pressable
        onPress={deleteProfilePicture}
        style={{
          paddingVertical: 8,
          paddingHorizontal: 16,
          borderWidth: 1,
          borderColor: "#DC2626",
          borderRadius: 12,
          backgroundColor: "#fff",
        }}
      >
        <Text style={{ color: "#DC2626", fontWeight: "600" }}>Remove Photo</Text>
      </Pressable>
    )}
  </View>

</View>

      {/* Header */}
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.subtitle}>Manage your account settings and preferences</Text>


      {/* Profile Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Personal Information</Text>
        <View style={styles.cardContent}>
          <View style={styles.rowBetween}>
            <Text style={styles.label}>Full Name:</Text>
            <Text>{profile?.full_name}</Text>
          </View>
          <View style={styles.rowBetween}>
            <Text style={styles.label}>Email:</Text>
            <Text>{profile?.email}</Text>
          </View>
          <View style={styles.rowBetween}>
            <Text style={styles.label}>Phone:</Text>
            <Text>{profile?.phone || "Not set"}</Text>
          </View>
          <View style={styles.rowBetween}>
            <Text style={styles.label}>Member Since:</Text>
            <Text>{profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : "Unknown"}</Text>
          </View>
        </View>
        <View style={styles.buttonRow}>
          <Pressable style={styles.primaryButton} onPress={() => setIsEditMode(true)}>
            <Text style={styles.primaryButtonText}>Edit Profile</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => setIsPasswordMode(true)}>
            <Text style={styles.secondaryButtonText}>Change Password</Text>
          </Pressable>
        </View>
      </View>

        {/* Logout Card */}
<View style={[styles.card, { backgroundColor: "#FEF3C7", borderColor: "#FCD34D", marginBottom: 32 }]}>
  <Text style={[styles.cardTitle, { color: "#ff5e00" }]}>Logout</Text>
  <Text style={{ color: "#92400E", marginBottom: 12 }}>
    Log out from your account safely
  </Text>
  <Pressable 
    style={[styles.primaryButton, { backgroundColor: "#F59E0B" }]} 
    onPress={() => setIsLogoutMode(true)}
  >
    <Text style={styles.primaryButtonText}>Logout</Text>
  </Pressable>
</View>

          
      {/* Delete Account */}
      <View style={[styles.card, { backgroundColor: "#FEE2E2", borderColor: "#FECACA", marginBottom:70 }]}>
        <Text style={[styles.cardTitle, { color: "#B91C1C" }]}>Delete Account</Text>
        <Text style={{ color: "#991B1B", marginBottom: 12 }}>
          Permanently delete your account and all associated data
        </Text>
        <Pressable style={[styles.primaryButton, { backgroundColor: "#DC2626" }]} onPress={() => setIsDeleteMode(true)}>
          <Text style={styles.primaryButtonText}>Delete Account</Text>
        </Pressable>
      </View>

      {/* Edit Profile Modal */}
      {isEditMode && (
        <View style={styles.modal}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              value={editForm.full_name}
              onChangeText={(text) => setEditForm({ ...editForm, full_name: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Phone Number"
              value={editForm.phone}
              onChangeText={(text) => setEditForm({ ...editForm, phone: text })}
            />
            <View style={styles.modalButtons}>
              <Pressable style={[styles.secondaryButton, { flex: 1 }]} onPress={() => setIsEditMode(false)}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.primaryButton, { flex: 1 }]} onPress={handleUpdateProfile}>
                <Text style={styles.primaryButtonText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      
      {/* Change Password Modal */}
{isPasswordMode && (
  <View style={styles.modal}>
    <View style={styles.modalContent}>
      <Text style={styles.modalTitle}>Change Password</Text>

      {/* Current Password */}
      <View style={{ position: "relative", marginBottom: 12 }}>
        <TextInput
          style={styles.input}
          placeholder="Current Password"
          secureTextEntry={!showCurrentPassword}
          value={passwordForm.currentPassword}
          onChangeText={(text) =>
            setPasswordForm({ ...passwordForm, currentPassword: text })
          }
        />
        <Pressable
          style={{ position: "absolute", right: 12, top: 12 }}
          onPress={() => setShowCurrentPassword(!showCurrentPassword)}
        >
          <Ionicons
            name={showCurrentPassword ? "eye-off" : "eye"}
            size={20}
            color="#6B7280"
          />
        </Pressable>
      </View>

      {/* New Password */}
      <View style={{ position: "relative", marginBottom: 12 }}>
        <TextInput
          style={styles.input}
          placeholder="New Password"
          secureTextEntry={!showNewPassword}
          value={passwordForm.newPassword}
          onChangeText={(text) =>
            setPasswordForm({ ...passwordForm, newPassword: text })
          }
        />
        <Pressable
          style={{ position: "absolute", right: 12, top: 12 }}
          onPress={() => setShowNewPassword(!showNewPassword)}
        >
          <Ionicons
            name={showNewPassword ? "eye-off" : "eye"}
            size={20}
            color="#6B7280"
          />
        </Pressable>
      </View>

      {/* Confirm New Password */}
      <View style={{ position: "relative", marginBottom: 12 }}>
        <TextInput
          style={styles.input}
          placeholder="Confirm New Password"
          secureTextEntry={!showConfirmPassword}
          value={passwordForm.confirmPassword}
          onChangeText={(text) =>
            setPasswordForm({ ...passwordForm, confirmPassword: text })
          }
        />
        <Pressable
          style={{ position: "absolute", right: 12, top: 12 }}
          onPress={() => setShowConfirmPassword(!showConfirmPassword)}
        >
          <Ionicons
            name={showConfirmPassword ? "eye-off" : "eye"}
            size={20}
            color="#6B7280"
          />
        </Pressable>
      </View>

      {/* Modal Buttons */}
      <View style={styles.modalButtons}>
        <Pressable
          style={[styles.secondaryButton, { flex: 1 }]}
          onPress={() => setIsPasswordMode(false)}
        >
          <Text style={styles.secondaryButtonText}>Cancel</Text>
        </Pressable>
        <Pressable
          style={[styles.primaryButton, { flex: 1 }]}
          onPress={handleChangePassword}
        >
          <Text style={styles.primaryButtonText}>Save</Text>
        </Pressable>
      </View>
    </View>
  </View>
)}

{/* Logout Confirmation Modal */}
{isLogoutMode && (
  <View style={styles.modal}>
    <View style={styles.modalContent}>
      <Text style={styles.modalTitle}>Confirm Logout</Text>
      <Text style={{ marginBottom: 16 }}>
        Are you sure you want to logout from your account?
      </Text>

      <View style={styles.modalButtons}>
        <Pressable
          style={[styles.secondaryButton, { flex: 1 }]}
          onPress={() => setIsLogoutMode(false)} // closes modal
        >
          <Text style={styles.secondaryButtonText}>Cancel</Text>
        </Pressable>

        <Pressable
          style={[styles.primaryButton, { flex: 1, backgroundColor: "#F59E0B" }]}
          onPress={handleLogout} // actually logs out
        >
          <Text style={styles.primaryButtonText}>Logout</Text>
        </Pressable>
      </View>
    </View>
  </View>
)}

      {/* Delete Account Modal */}
      {isDeleteMode && (
  <View style={styles.modal}>
    <View style={styles.modalContent}>
      <Text style={styles.modalTitle}>Delete Account</Text>
      <Text style={{ marginBottom: 12 }}>
        This action cannot be undone. All your data will be permanently deleted.
      </Text>

      {/* Extra safety input */}
      <Text style={{ marginBottom: 6, color: "#687ea5" }}>Type "DELETE" to confirm</Text>
      <TextInput
        style={[styles.input, { marginBottom: 16 }]}
        placeholder="DELETE"
        value={confirmText}
        onChangeText={setConfirmText}
      />

      <View style={styles.modalButtons}>
        <Pressable
          style={[styles.secondaryButton, { flex: 1 }]}
          onPress={() => {
            setIsDeleteMode(false);
            setConfirmText(""); // reset input
          }}
        >
          <Text style={styles.secondaryButtonText}>Cancel</Text>
        </Pressable>

        <Pressable
          style={[
            styles.primaryButton,
            { flex: 1, backgroundColor: confirmText === "DELETE" ? "#DC2626" : "#FCA5A5" },
          ]}
          disabled={confirmText !== "DELETE"}
          onPress={handleDeleteAccount}
        >
          <Text style={styles.primaryButtonText}>Delete</Text>
        </Pressable>
      </View>
    </View>
  </View>
)}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF", padding: 20 },
  title: { fontSize: 28, fontWeight: "800", textAlign: "center", paddingBottom:5, color: "#111827" },
  subtitle: { fontSize: 16, color: "#6B7280", marginBottom: 16 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 14, padding: 16, borderWidth: 1, borderColor: "#E5E7EB", marginBottom: 16 },
  cardTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  cardContent: { gap: 12 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { color: "#6B7280", fontWeight: "600" },
  buttonRow: { flexDirection: "row", gap: 12, marginTop: 16 },
  primaryButton: { flex: 1, backgroundColor: "#2563EB", paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  primaryButtonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 16 },
  secondaryButton: { flex: 1, backgroundColor: "#F3F4F6", paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  secondaryButtonText: { color: "#2563EB", fontWeight: "700", fontSize: 16 },
  input: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, marginBottom: 12 },
  modal: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "center", alignItems: "center" },
  modalContent: { backgroundColor: "#FFFFFF", borderRadius: 14, padding: 24, width: "90%" },
  modalTitle: { fontSize: 20, fontWeight: "700", marginBottom: 16 },
  modalButtons: { flexDirection: "row", gap: 12, marginTop: 12 },
  centerState: { flex: 1, justifyContent: "center", alignItems: "center" },
});