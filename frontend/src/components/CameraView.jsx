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
import { CameraView as ExpoCameraView } from "expo-camera";
import { Zap, ZapOff, RefreshCcw, ScanLine } from "lucide-react-native";
import Svg, { Defs, Mask, Rect } from "react-native-svg";
import * as Haptics from "expo-haptics";

// ── Flash Mode Cycle ────────────────────────────────────────────────────────
const FLASH_MODES = ["off", "on", "auto"];
const FlashIcon = ({ mode, color }) => {
  if (mode === "off") return <ZapOff size={24} color={color} />;
  if (mode === "on") return <Zap size={24} color={color} />;
  return <Zap size={24} color={color} fill={color} />; // Auto
};

export default function CameraView({ onCapture, disabled = false }) {
  const cameraRef = useRef(null);
  const [flashMode, setFlashMode] = useState("off");
  const [facing, setFacing] = useState("back");
  const shutterScale = useRef(new Animated.Value(1)).current;

  // ── Flash Toggle ────────────────────────────────────────────────────────
  const cycleFlash = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFlashMode((current) => {
      const idx = FLASH_MODES.indexOf(current);
      return FLASH_MODES[(idx + 1) % FLASH_MODES.length];
    });
  }, []);

  // ── Camera Flip ─────────────────────────────────────────────────────────
  const flipCamera = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFacing((current) => (current === "back" ? "front" : "back"));
  }, []);

  // ── Shutter Animation ──────────────────────────────────────────────────
  const animateShutter = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
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
    <View className="flex-1 bg-black">
      {/* ── Camera Preview ─────────────────────────────────────────────── */}
      <ExpoCameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        flash={flashMode}
      />

      {/* ── Top Gradient Overlay ───────────────────────────────────────── */}
      <View className="absolute top-0 left-0 right-0 pt-[60px] px-5 pb-5 bg-black/45 flex-row justify-between items-center z-10">
        {/* App Title */}
        <View className="flex-row items-center gap-2">
          <ScanLine size={24} color="#22d3ee" strokeWidth={2.5} />
          <Text className="text-scanner-accent text-lg font-bold tracking-wide">
            Antigravity
          </Text>
        </View>

        {/* Top Controls */}
        <View className="flex-row gap-3">
          {/* Flash Toggle */}
          <Pressable
            onPress={cycleFlash}
            className="w-11 h-11 rounded-full bg-white/15 justify-center items-center border border-white/20 active:bg-white/30"
            accessibilityLabel={`Flash ${flashMode}`}
            accessibilityRole="button"
          >
            <FlashIcon mode={flashMode} color="#fff" />
          </Pressable>

          {/* Flip Camera */}
          <Pressable
            onPress={flipCamera}
            className="w-11 h-11 rounded-full bg-white/15 justify-center items-center border border-white/20 active:bg-white/30"
            accessibilityLabel="Flip camera"
            accessibilityRole="button"
          >
            <RefreshCcw size={22} color="#fff" />
          </Pressable>
        </View>
      </View>

      {/* ── Scanner Cutout Overlay ───────────────────────────────────────── */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none" className="z-5">
        <Svg height="100%" width="100%">
          <Defs>
            <Mask id="scanner-mask" x="0" y="0" height="100%" width="100%">
              {/* Everything white is kept, black is cut out */}
              <Rect height="100%" width="100%" fill="#fff" />
              {/* The transparent hole in the middle */}
              <Rect x="10%" y="22%" width="80%" height="45%" fill="black" rx="32" ry="32" />
            </Mask>
          </Defs>
          {/* Dark overlay filling the screen */}
          <Rect height="100%" width="100%" fill="rgba(0,0,0,0.65)" mask="url(#scanner-mask)" />

          {/* Scanner Frame Border */}
          <Rect
            x="10%"
            y="22%"
            width="80%"
            height="45%"
            fill="none"
            stroke="#22d3ee"
            strokeWidth="3"
            rx="32"
            ry="32"
            strokeDasharray="40 20"
          />
        </Svg>

        <View className="absolute top-[70%] left-0 right-0 items-center">
          <View className="bg-black/50 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md">
            <Text className="text-white/90 text-sm font-medium tracking-wide">
              Center the food item in frame
            </Text>
          </View>
        </View>
      </View>

      {/* ── Bottom Controls ────────────────────────────────────────────── */}
      <View className="absolute bottom-0 left-0 right-0 pb-[50px] pt-6 bg-black/50 items-center z-10">
        {/* Shutter Button */}
        <Animated.View
          style={{ transform: [{ scale: shutterScale }] }}
          className="w-20 h-20 rounded-full border-[4px] border-white/80 justify-center items-center p-1"
        >
          <Pressable
            onPress={handleCapture}
            disabled={disabled}
            className={`w-full h-full rounded-full bg-white/90 justify-center items-center active:bg-scanner-accent ${
              disabled ? "opacity-50" : ""
            }`}
            accessibilityLabel="Capture photo"
            accessibilityRole="button"
          >
            <View className="w-5 h-5 rounded-full bg-red-500 shadow-md" />
          </Pressable>
        </Animated.View>

        <Text className="text-white/60 text-sm mt-4 tracking-wide">
          {disabled ? "Processing…" : "Tap to scan food"}
        </Text>
      </View>
    </View>
  );
}
