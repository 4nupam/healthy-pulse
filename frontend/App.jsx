/**
 * Antigravity Food Scanner — App Root
 * =====================================
 * Core state coordinator managing camera permissions, image capture,
 * API communication, loading states, and result display.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useCameraPermissions } from "expo-camera";

import CameraView from "./src/components/CameraView";
import MacroSheet from "./src/components/MacroSheet";
import api from "./src/utils/api";

// ── Permission States ───────────────────────────────────────────────────────
const PermState = {
  LOADING: "loading",
  GRANTED: "granted",
  DENIED: "denied",
};

export default function App() {
  // ── State ───────────────────────────────────────────────────────────────
  const [permission, requestPermission] = useCameraPermissions();
  const [permState, setPermState] = useState(PermState.LOADING);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [showSheet, setShowSheet] = useState(false);

  // Pulse animation for the loading skeleton
  const pulseAnim = useRef(new Animated.Value(0.4)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;

  // ── Permission Sync ───────────────────────────────────────────────────
  useEffect(() => {
    if (!permission) {
      setPermState(PermState.LOADING);
    } else if (permission.granted) {
      setPermState(PermState.GRANTED);
    } else {
      setPermState(PermState.DENIED);
    }
  }, [permission]);

  // ── Skeleton Pulse ────────────────────────────────────────────────────
  useEffect(() => {
    if (permState === PermState.LOADING) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.4,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [permState, pulseAnim]);

  // ── Spinner Rotation ──────────────────────────────────────────────────
  useEffect(() => {
    if (isProcessing) {
      const loop = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      );
      loop.start();
      return () => loop.stop();
    } else {
      spinAnim.setValue(0);
    }
  }, [isProcessing, spinAnim]);

  const spinInterpolate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  // ── Handle Permission Request ─────────────────────────────────────────
  const handleRequestPermission = useCallback(async () => {
    try {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert(
          "Permission Required",
          "Camera access is needed to scan food items. Please enable it in your device settings.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.error("[App] Permission request failed:", error);
      Alert.alert("Error", "Failed to request camera permission.");
    }
  }, [requestPermission]);

  // ── Handle Photo Capture ──────────────────────────────────────────────
  const handleCapture = useCallback(
    async (photoUri) => {
      if (isProcessing) return;

      setIsProcessing(true);

      try {
        // Build FormData with the captured image
        const formData = new FormData();
        formData.append("file", {
          uri: photoUri,
          type: "image/jpeg",
          name: "scan.jpg",
        });

        // Send to backend
        const response = await api.post("/api/v1/scan", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        const result = response.data;

        if (result.success) {
          setScanResult(result);
          setShowSheet(true);
        } else {
          Alert.alert(
            "No Food Detected",
            result.message ||
              "Could not identify a food item. Try a clearer photo.",
            [{ text: "Try Again" }]
          );
        }
      } catch (error) {
        console.error("[App] Scan failed:", error);

        const message =
          error.userMessage ||
          "Failed to analyze the image. Please check your connection and try again.";

        Alert.alert("Scan Failed", message, [{ text: "OK" }]);
      } finally {
        setIsProcessing(false);
      }
    },
    [isProcessing]
  );

  // ── Handle Reset ──────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    setShowSheet(false);
    // Delay clearing data so the slide-out animation can play
    setTimeout(() => {
      setScanResult(null);
    }, 300);
  }, []);

  // ── Render: Loading Skeleton ──────────────────────────────────────────
  if (permState === PermState.LOADING) {
    return (
      <SafeAreaView style={styles.fullScreen}>
        <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
        <View style={styles.centeredContainer}>
          <Animated.Text
            style={[styles.loadingIcon, { opacity: pulseAnim }]}
          >
            🔬
          </Animated.Text>
          <Text style={styles.loadingTitle}>Antigravity</Text>
          <Text style={styles.loadingSubtitle}>
            Initializing food scanner…
          </Text>

          {/* Skeleton bars */}
          <View style={styles.skeletonContainer}>
            {[0.8, 0.6, 0.4].map((width, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.skeletonBar,
                  {
                    width: `${width * 100}%`,
                    opacity: pulseAnim,
                  },
                ]}
              />
            ))}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── Render: Permission Denied CTA ─────────────────────────────────────
  if (permState === PermState.DENIED) {
    return (
      <SafeAreaView style={styles.fullScreen}>
        <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
        <View style={styles.centeredContainer}>
          <View style={styles.deniedIconContainer}>
            <Text style={styles.deniedIcon}>📸</Text>
          </View>

          <Text style={styles.deniedTitle}>Camera Access Needed</Text>
          <Text style={styles.deniedSubtitle}>
            Antigravity Food Scanner uses your camera to identify food
            items and show their nutritional information in real time.
          </Text>

          <Pressable
            onPress={handleRequestPermission}
            style={({ pressed }) => [
              styles.grantButton,
              pressed && styles.grantButtonPressed,
            ]}
            accessibilityLabel="Grant camera access"
            accessibilityRole="button"
          >
            <Text style={styles.grantButtonText}>
              🔓 Grant Camera Access
            </Text>
          </Pressable>

          <Text style={styles.deniedHint}>
            Your camera feed is processed locally and never stored.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Render: Main Scanner ──────────────────────────────────────────────
  return (
    <View style={styles.fullScreen}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Camera */}
      <CameraView onCapture={handleCapture} disabled={isProcessing} />

      {/* Processing Overlay */}
      {isProcessing && (
        <View style={styles.processingOverlay}>
          <View style={styles.processingCard}>
            <Animated.Text
              style={[
                styles.processingSpinner,
                { transform: [{ rotate: spinInterpolate }] },
              ]}
            >
              🔬
            </Animated.Text>
            <Text style={styles.processingTitle}>Analyzing Food</Text>
            <Text style={styles.processingSubtitle}>
              Running AI detection…
            </Text>
            <ActivityIndicator
              size="small"
              color="#22d3ee"
              style={styles.processingIndicator}
            />
          </View>
        </View>
      )}

      {/* Results Sheet */}
      <MacroSheet
        data={scanResult}
        onReset={handleReset}
        visible={showSheet}
      />
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: "#0f172a",
  },

  // ── Centered Layout ───────────────────────────────────────────────────
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },

  // ── Loading Skeleton ──────────────────────────────────────────────────
  loadingIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  loadingTitle: {
    color: "#22d3ee",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 8,
  },
  loadingSubtitle: {
    color: "#94a3b8",
    fontSize: 14,
    letterSpacing: 0.3,
    marginBottom: 32,
  },
  skeletonContainer: {
    width: "100%",
    gap: 12,
    alignItems: "center",
  },
  skeletonBar: {
    height: 12,
    borderRadius: 6,
    backgroundColor: "#1e293b",
  },

  // ── Denied CTA ────────────────────────────────────────────────────────
  deniedIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(34,211,238,0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 2,
    borderColor: "rgba(34,211,238,0.2)",
  },
  deniedIcon: {
    fontSize: 44,
  },
  deniedTitle: {
    color: "#f8fafc",
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 0.3,
    marginBottom: 12,
    textAlign: "center",
  },
  deniedSubtitle: {
    color: "#94a3b8",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  grantButton: {
    backgroundColor: "#22d3ee",
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 16,
    marginBottom: 24,
    // Shadow
    shadowColor: "#22d3ee",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  grantButtonPressed: {
    backgroundColor: "#06b6d4",
    transform: [{ scale: 0.97 }],
  },
  grantButtonText: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  deniedHint: {
    color: "#475569",
    fontSize: 12,
    textAlign: "center",
    letterSpacing: 0.2,
  },

  // ── Processing Overlay ────────────────────────────────────────────────
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 15,
  },
  processingCard: {
    backgroundColor: "#1e293b",
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    minWidth: 200,
    borderWidth: 1,
    borderColor: "#334155",
    // Shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 16,
  },
  processingSpinner: {
    fontSize: 48,
    marginBottom: 16,
  },
  processingTitle: {
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  processingSubtitle: {
    color: "#94a3b8",
    fontSize: 13,
    letterSpacing: 0.2,
  },
  processingIndicator: {
    marginTop: 16,
  },
});
