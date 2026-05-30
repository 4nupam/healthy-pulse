/**
 * Antigravity Food Scanner — MacroSheet Component
 * ==================================================
 * Premium glassmorphism bottom sheet overlay that displays
 * detected food item name, confidence score, and a 2×2 grid
 * of color-coded macro nutrient cards.
 *
 * Props
 * -----
 * data     : { food_item, confidence, nutrition: { calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g } }
 * onReset  : Callback to dismiss the sheet and return to camera.
 * visible  : Boolean controlling sheet visibility.
 */

import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Utensils, Flame, Beef, Wheat, Droplets, RotateCcw, AlertTriangle } from "lucide-react-native";
import * as Haptics from "expo-haptics";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.55;

// ── Macro Card Config ───────────────────────────────────────────────────────
const MACRO_CARDS = [
  {
    key: "calories",
    label: "Calories",
    unit: "kcal",
    Icon: Flame,
    field: "calories_per_100g",
    gradient: ["#064e3b", "#065f46"],
    colors: { text: "#6ee7b7", accent: "#10b981" },
  },
  {
    key: "protein",
    label: "Protein",
    unit: "g",
    Icon: Beef,
    field: "protein_per_100g",
    gradient: ["#4c0519", "#881337"],
    colors: { text: "#fda4af", accent: "#f43f5e" },
  },
  {
    key: "carbs",
    label: "Carbs",
    unit: "g",
    Icon: Wheat,
    field: "carbs_per_100g",
    gradient: ["#451a03", "#78350f"],
    colors: { text: "#fcd34d", accent: "#f59e0b" },
  },
  {
    key: "fat",
    label: "Fat",
    unit: "g",
    Icon: Droplets,
    field: "fat_per_100g",
    gradient: ["#0c4a6e", "#075985"],
    colors: { text: "#7dd3fc", accent: "#0ea5e9" },
  },
];

export default function MacroSheet({ data, onReset, visible }) {
  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const hasTriggeredHaptic = useRef(false);

  // ── Slide Animation ───────────────────────────────────────────────────
  useEffect(() => {
    if (visible) {
      if (!hasTriggeredHaptic.current) {
        // Trigger a nice success haptic slightly after the animation starts
        setTimeout(() => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }, 100);
        hasTriggeredHaptic.current = true;
      }

      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 65,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      hasTriggeredHaptic.current = false;
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SHEET_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, fadeAnim]);

  if (!data || !visible) return null;

  const { food_item, confidence, nutrition } = data;
  const confidencePercent = Math.round((confidence || 0) * 100);

  // Confidence pill coloring
  let confBg = "bg-rose-500/20";
  let confText = "text-rose-300";
  if (confidencePercent >= 80) {
    confBg = "bg-emerald-500/20";
    confText = "text-emerald-300";
  } else if (confidencePercent >= 60) {
    confBg = "bg-amber-500/20";
    confText = "text-amber-300";
  }

  return (
    <>
      {/* ── Backdrop ──────────────────────────────────────────────────── */}
      <Animated.View
        className="absolute inset-0 bg-black/60 z-20"
        style={{ opacity: fadeAnim }}
        pointerEvents={visible ? "auto" : "none"}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onReset} />
      </Animated.View>

      {/* ── Sheet ─────────────────────────────────────────────────────── */}
      <Animated.View
        className="absolute bottom-0 left-0 right-0 h-[55%] rounded-t-3xl overflow-hidden z-30 shadow-black border-t border-l border-r border-slate-700/60"
        style={{
          transform: [{ translateY: slideAnim }],
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -8 },
          shadowOpacity: 0.4,
          shadowRadius: 16,
          elevation: 24,
        }}
      >
        <BlurView intensity={70} tint="dark" style={StyleSheet.absoluteFill} />
        
        {/* Solid fallback color just in case BlurView fails */}
        <View className="absolute inset-0 bg-scanner-bg/80" />

        <View className="px-5 pb-8 flex-1">
          {/* Drag Handle */}
          <View className="items-center py-3">
            <View className="w-10 h-1.5 rounded-full bg-slate-500/80" />
          </View>

          {/* ── Header ─────────────────────────────────────────────────── */}
          <View className="flex-row justify-between items-center mb-6">
            <View className="flex-row items-center gap-3 flex-1 mr-3">
              <View className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 items-center justify-center">
                <Utensils size={24} color="#f8fafc" />
              </View>
              <View>
                <Text className="text-scanner-text text-2xl font-extrabold tracking-wide" numberOfLines={1}>
                  {food_item || "Unknown Food"}
                </Text>
                <Text className="text-scanner-muted text-xs mt-0.5 tracking-wide">
                  per 100g serving
                </Text>
              </View>
            </View>

            {/* Confidence Badge */}
            <View className={`px-3 py-1.5 rounded-full ${confBg}`}>
              <Text className={`text-sm font-bold tracking-wide ${confText}`}>
                {confidencePercent}% match
              </Text>
            </View>
          </View>

          {/* ── Macro Grid ─────────────────────────────────────────────── */}
          {nutrition ? (
            <View className="flex-row flex-wrap gap-3 mb-6">
              {MACRO_CARDS.map((card) => {
                const Icon = card.Icon;
                return (
                  <View
                    key={card.key}
                    className="w-[47%] rounded-2xl border border-white/5 overflow-hidden shadow-sm"
                  >
                    <LinearGradient
                      colors={card.gradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      className="p-4 flex-1"
                    >
                      <View className="flex-row items-center gap-2 mb-2">
                        <Icon size={16} color={card.colors.text} />
                        <Text
                          className="text-xs font-semibold tracking-wide uppercase"
                          style={{ color: card.colors.text }}
                        >
                          {card.label}
                        </Text>
                      </View>
                      <Text
                        className="text-3xl font-extrabold tracking-tight"
                        style={{ color: card.colors.text }}
                      >
                        {nutrition[card.field] ?? "—"}
                      </Text>
                      <Text
                        className="text-sm font-medium mt-0.5 tracking-wide"
                        style={{ color: card.colors.accent }}
                      >
                        {card.unit}
                      </Text>
                    </LinearGradient>
                  </View>
                );
              })}
            </View>
          ) : (
            <View className="flex-1 items-center justify-center py-6 mb-6">
              <View className="w-16 h-16 rounded-full bg-slate-800/50 justify-center items-center mb-3 border border-slate-700/50">
                <AlertTriangle size={32} color="#94a3b8" />
              </View>
              <Text className="text-scanner-muted text-sm text-center px-4">
                Nutrition data not available for this item.
              </Text>
            </View>
          )}

          {/* ── Scan Another Button ────────────────────────────────────── */}
          <View className="flex-1 justify-end">
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onReset();
              }}
              className="bg-scanner-surface/80 rounded-2xl py-4 items-center border border-scanner-border active:bg-scanner-border flex-row justify-center gap-2"
              accessibilityLabel="Scan another food item"
              accessibilityRole="button"
            >
              <RotateCcw size={18} color="#22d3ee" strokeWidth={2.5} />
              <Text className="text-scanner-accent text-base font-bold tracking-wide">
                Scan Another
              </Text>
            </Pressable>
          </View>
        </View>
      </Animated.View>
    </>
  );
}
