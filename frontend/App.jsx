/**
 * Antigravity Food Scanner — App Root
 * =====================================
 * Core state coordinator managing camera permissions, image capture,
 * API communication, loading states, and result display.
 */

import "./global.css";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Pressable,
  SafeAreaView,
  StatusBar,
  Text,
  View,
} from "react-native";
import { useCameraPermissions } from "expo-camera";
import { Camera, AlertCircle, Unlock } from "lucide-react-native";
import * as Haptics from "expo-haptics";

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
    } else if (permission.canAskAgain && permission.status !== "denied") {
      // Automatically request permission on first launch
      requestPermission();
      setPermState(PermState.LOADING);
    } else {
      setPermState(PermState.DENIED);
    }
  }, [permission, requestPermission]);

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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
      <SafeAreaView className="flex-1 bg-scanner-bg">
        <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
        <View className="flex-1 justify-center items-center px-8">
          <Animated.View style={{ opacity: pulseAnim }} className="mb-4">
            <Camera size={64} color="#22d3ee" strokeWidth={1.5} />
          </Animated.View>
          <Text className="text-scanner-accent text-3xl font-extrabold tracking-widest mb-2">
            ANTIGRAVITY
          </Text>
          <Text className="text-scanner-muted text-sm tracking-wide mb-8">
            Initializing food scanner…
          </Text>

          {/* Skeleton bars */}
          <View className="w-full gap-3 items-center">
            {[0.8, 0.6, 0.4].map((width, i) => (
              <Animated.View
                key={i}
                className="h-3 rounded-full bg-scanner-surface"
                style={{
                  width: `${width * 100}%`,
                  opacity: pulseAnim,
                }}
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
      <SafeAreaView className="flex-1 bg-scanner-bg">
        <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
        <View className="flex-1 justify-center items-center px-8">
          <View className="w-24 h-24 rounded-full bg-scanner-accent/10 border-2 border-scanner-accent/20 justify-center items-center mb-6">
            <AlertCircle size={44} color="#22d3ee" />
          </View>

          <Text className="text-scanner-text text-2xl font-extrabold tracking-wide mb-3 text-center">
            Camera Access Needed
          </Text>
          <Text className="text-scanner-muted text-base leading-6 text-center mb-8 px-2">
            Antigravity Food Scanner uses your camera to identify food
            items and show their nutritional information in real time.
          </Text>

          <Pressable
            onPress={handleRequestPermission}
            className="bg-scanner-accent py-4 px-10 rounded-2xl mb-6 shadow-lg shadow-scanner-accent/30 active:scale-95 active:bg-cyan-500 flex-row items-center gap-3"
            accessibilityLabel="Grant camera access"
            accessibilityRole="button"
          >
            <Unlock size={20} color="#0f172a" strokeWidth={2.5} />
            <Text className="text-scanner-bg text-base font-extrabold tracking-wide">
              Grant Camera Access
            </Text>
          </Pressable>

          <Text className="text-slate-500 text-xs text-center tracking-wide">
            Your camera feed is processed locally and never stored.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Render: Main Scanner ──────────────────────────────────────────────
  return (
    <View className="flex-1 bg-black">
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Camera */}
      <CameraView onCapture={handleCapture} disabled={isProcessing} />

      {/* Processing Overlay */}
      {isProcessing && (
        <View className="absolute inset-0 bg-black/75 justify-center items-center z-15">
          <View className="bg-scanner-surface rounded-3xl p-8 items-center min-w-[220px] border border-scanner-border shadow-2xl shadow-black/40">
            <Animated.View
              style={{ transform: [{ rotate: spinInterpolate }] }}
              className="mb-4"
            >
              <Camera size={48} color="#22d3ee" strokeWidth={1} />
            </Animated.View>
            <Text className="text-scanner-text text-lg font-bold mb-1">
              Analyzing Food
            </Text>
            <Text className="text-scanner-muted text-sm tracking-wide">
              Running AI detection…
            </Text>
            <ActivityIndicator
              size="small"
              color="#22d3ee"
              className="mt-5"
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
