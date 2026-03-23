import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

type ReceiptScannerProps = {
  visible: boolean;
  onClose: () => void;
  onImageSelected: (imageUri: string) => Promise<void> | void;
  busy?: boolean;
};

export function ReceiptScanner({
  visible,
  onClose,
  onImageSelected,
  busy = false
}: ReceiptScannerProps): React.JSX.Element {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [capturing, setCapturing] = useState(false);
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const cameraHeight = Math.min(height * 0.84, 660);

  async function handleTakePhoto(): Promise<void> {
    if (!cameraRef.current || busy || capturing) {
      return;
    }
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7
      });
      if (photo?.uri) {
        await onImageSelected(photo.uri);
      }
    } finally {
      setCapturing(false);
    }
  }

  async function handlePickImage(): Promise<void> {
    if (busy || capturing) {
      return;
    }
    const mediaPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!mediaPermission.granted) {
      return;
    }
    const selected = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8
    });
    if (!selected.canceled && selected.assets?.[0]?.uri) {
      await onImageSelected(selected.assets[0].uri);
    }
  }

  const cameraReady = Boolean(permission?.granted);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView
        style={[
          styles.container,
          { paddingTop: Math.max(insets.top, 12), paddingBottom: Math.max(insets.bottom, 12) }
        ]}
        edges={["top", "bottom"]}
      >
        <View style={styles.header}>
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle}>Receipt Scanner</Text>
            <Text style={styles.headerSubtitle}>Align the receipt within the frame</Text>
          </View>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Close</Text>
          </Pressable>
        </View>

        {!permission ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.stateText}>Checking camera permission...</Text>
          </View>
        ) : null}

        {permission && !cameraReady ? (
          <View style={styles.centerState}>
            <Text style={styles.stateText}>Camera permission is required.</Text>
            <Pressable style={styles.primaryButton} onPress={requestPermission}>
              <Text style={styles.primaryButtonText}>Grant Permission</Text>
            </Pressable>
          </View>
        ) : null}

        {cameraReady ? (
          <View style={[styles.cameraWrap, { height: cameraHeight }]}>
            <CameraView ref={cameraRef} style={styles.camera} facing="back" />
          </View>
        ) : null}

        <View style={styles.controls}>
          <Pressable
            style={[styles.primaryButton, (busy || capturing) && styles.disabledButton]}
            onPress={handleTakePhoto}
            disabled={busy || capturing}
          >
            <Text style={styles.primaryButtonText}>
              {capturing ? "Scanning..." : busy ? "Analyzing..." : "Scan Receipt"}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.secondaryButton, (busy || capturing) && styles.disabledButton]}
            onPress={handlePickImage}
            disabled={busy || capturing}
          >
            <Text style={styles.secondaryButtonText}>Pick from Gallery</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF"
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    backgroundColor: "#FFFFFF"
  },
  headerTextWrap: {
    flex: 1,
    paddingRight: 12
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827"
  },
  headerSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: "#667085"
  },
  closeButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#F3F4F6"
  },
  closeButtonText: {
    color: "#2563EB",
    fontWeight: "600"
  },
  cameraWrap: {
    alignSelf: "center",
    width: "92%",
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#000"
  },
  camera: {
    flex: 1
  },
  controls: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 10
  },
  primaryButton: {
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center"
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "700"
  },
  secondaryButton: {
    backgroundColor: "#E5E7EB",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center"
  },
  secondaryButtonText: {
    color: "#111827",
    fontWeight: "700"
  },
  disabledButton: {
    opacity: 0.6
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12
  },
  stateText: {
    color: "#667085"
  }
});
