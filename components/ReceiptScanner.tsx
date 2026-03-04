import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Receipt Scanner</Text>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Close</Text>
          </Pressable>
        </View>

        {!permission ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color="#0f766e" />
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
          <View style={styles.cameraWrap}>
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
              {capturing ? "Capturing..." : busy ? "Analyzing..." : "Take Photo"}
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
    backgroundColor: "#f8fafc"
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a"
  },
  closeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  closeButtonText: {
    color: "#0f766e",
    fontWeight: "600"
  },
  cameraWrap: {
    flex: 1,
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
    paddingVertical: 16,
    gap: 10
  },
  primaryButton: {
    backgroundColor: "#0f766e",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center"
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "700"
  },
  secondaryButton: {
    backgroundColor: "#e2e8f0",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center"
  },
  secondaryButtonText: {
    color: "#0f172a",
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
    color: "#334155"
  }
});