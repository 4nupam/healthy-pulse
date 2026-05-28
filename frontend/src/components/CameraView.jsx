/**
 * Antigravity Food Scanner — CameraView Component
 * ==================================================
 * Full-screen live camera preview with flash toggle and
 * a sleek floating capture shutter button.
 *
 * Props
 * -----
 * onCapture(uri: string) : Called with the photo URI after capture.
 * disabled (boolean)     : Disables the shutter while processing.
 */

import React, { useCallback, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { CameraView as ExpoCameraView, CameraType } from "expo-camera";

// ── Flash Mode Cycle ────────────────────────────────────────────────────────
const FLASH_MODES = ["off", "on", "auto"];
const FLASH_ICONS = { off: "⚡️✕", on: "⚡️", auto: "⚡️A" };

export default function CameraView({ onCapture, disabled = false }) {
  const cameraRef = useRef(null);
  const [flashMode, setFlashMode] = useState("off");
  const [facing, setFacing] = useState("back");
  const shutterScale = useRef(new Animated.Value(1)).current;

  // ── Flash Toggle ────────────────────────────────────────────────────────
  const cycleFlash = useCallback(() => {
    setFlashMode((current) => {
      const idx = FLASH_MODES.indexOf(current);
      return FLASH_MODES[(idx + 1) % FLASH_MODES.length];
    });
  }, []);

  // ── Camera Flip ─────────────────────────────────────────────────────────
  const flipCamera = useCallback(() => {
    setFacing((current) => (current === "back" ? "front" : "back"));
  }, []);

  // ── Shutter Animation ──────────────────────────────────────────────────
  const animateShutter = useCallback(() => {
    Animated.sequence([
      Animated.timing(shutterScale, {
        toValue: 0.85,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.spring(shutterScale, {
        toValue: 1,
        friction: 4,
        tension: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [shutterScale]);

  // ── Capture Handler ───────────────────────────────────────────────────
  const handleCapture = useCallback(async () => {
    if (!cameraRef.current || disabled) return;

    animateShutter();

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.6,
        skipProcessing: false,
        exif: false,
      });

      if (photo?.uri) {
        onCapture(photo.uri);
      }
    } catch (error) {
      console.error("[CameraView] Capture failed:", error.message);
    }
  }, [disabled, onCapture, animateShutter]);

  return (
    <View style={styles.container}>
      {/* ── Camera Preview ─────────────────────────────────────────────── */}
      <ExpoCameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        flash={flashMode}
      />

      {/* ── Top Gradient Overlay ───────────────────────────────────────── */}
      <View style={styles.topOverlay}>
        {/* App Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.titleIcon}>🔬</Text>
          <Text style={styles.titleText}>Antigravity</Text>
        </View>

        {/* Top Controls */}
        <View style={styles.topControls}>
          {/* Flash Toggle */}
          <Pressable
            onPress={cycleFlash}
            style={({ pressed }) => [
              styles.controlButton,
              pressed && styles.controlButtonPressed,
            ]}
            accessibilityLabel={`Flash ${flashMode}`}
            accessibilityRole="button"
          >
            <Text style={styles.controlButtonText}>
              {FLASH_ICONS[flashMode]}
            </Text>
          </Pressable>

          {/* Flip Camera */}
          <Pressable
            onPress={flipCamera}
            style={({ pressed }) => [
              styles.controlButton,
              pressed && styles.controlButtonPressed,
            ]}
            accessibilityLabel="Flip camera"
            accessibilityRole="button"
          >
            <Text style={styles.controlButtonText}>🔄</Text>
          </Pressable>
        </View>
      </View>

      {/* ── Crosshair Overlay ──────────────────────────────────────────── */}
      <View style={styles.crosshairContainer} pointerEvents="none">
        <View style={styles.crosshairBox}>
          {/* Corner brackets */}
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>
        <Text style={styles.crosshairHint}>
          Center the food item in frame
        </Text>
      </View>

      {/* ── Bottom Controls ────────────────────────────────────────────── */}
      <View style={styles.bottomOverlay}>
        {/* Shutter Button */}
        <Animated.View
          style={[
            styles.shutterOuter,
            { transform: [{ scale: shutterScale }] },
          ]}
        >
          <Pressable
            onPress={handleCapture}
            disabled={disabled}
            style={({ pressed }) => [
              styles.shutterInner,
              pressed && styles.shutterPressed,
              disabled && styles.shutterDisabled,
            ]}
            accessibilityLabel="Capture photo"
            accessibilityRole="button"
          >
            <View style={styles.shutterDot} />
          </Pressable>
        </Animated.View>

        <Text style={styles.captureHint}>
          {disabled ? "Processing…" : "Tap to scan food"}
        </Text>
      </View>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },

  // ── Top Overlay ─────────────────────────────────────────────────────────
  topOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: "rgba(0,0,0,0.45)",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 10,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  titleIcon: {
    fontSize: 22,
  },
  titleText: {
    color: "#22d3ee",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  topControls: {
    flexDirection: "row",
    gap: 12,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  controlButtonPressed: {
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  controlButtonText: {
    fontSize: 18,
  },

  // ── Crosshair ──────────────────────────────────────────────────────────
  crosshairContainer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 5,
  },
  crosshairBox: {
    width: 240,
    height: 240,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 40,
    height: 40,
    borderColor: "#22d3ee",
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 12,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 12,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 12,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 12,
  },
  crosshairHint: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    marginTop: 16,
    letterSpacing: 0.3,
  },

  // ── Bottom Overlay ────────────────────────────────────────────────────
  bottomOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 50,
    paddingTop: 24,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    zIndex: 10,
  },
  shutterOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 4,
  },
  shutterInner: {
    width: "100%",
    height: "100%",
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  shutterPressed: {
    backgroundColor: "#22d3ee",
  },
  shutterDisabled: {
    opacity: 0.5,
  },
  shutterDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#ef4444",
  },
  captureHint: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    marginTop: 12,
    letterSpacing: 0.3,
  },
});
