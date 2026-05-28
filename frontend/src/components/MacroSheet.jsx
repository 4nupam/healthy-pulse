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

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.55;

// ── Macro Card Config ───────────────────────────────────────────────────────
const MACRO_CARDS = [
  {
    key: "calories",
    label: "Calories",
    unit: "kcal",
    icon: "🔥",
    field: "calories_per_100g",
    colors: { bg: "#064e3b", text: "#6ee7b7", accent: "#10b981" },
  },
  {
    key: "protein",
    label: "Protein",
    unit: "g",
    icon: "🥩",
    field: "protein_per_100g",
    colors: { bg: "#4c0519", text: "#fda4af", accent: "#f43f5e" },
  },
  {
    key: "carbs",
    label: "Carbs",
    unit: "g",
    icon: "🌾",
    field: "carbs_per_100g",
    colors: { bg: "#451a03", text: "#fcd34d", accent: "#f59e0b" },
  },
  {
    key: "fat",
    label: "Fat",
    unit: "g",
    icon: "💧",
    field: "fat_per_100g",
    colors: { bg: "#0c4a6e", text: "#7dd3fc", accent: "#0ea5e9" },
  },
];

export default function MacroSheet({ data, onReset, visible }) {
  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // ── Slide Animation ───────────────────────────────────────────────────
  useEffect(() => {
    if (visible) {
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

  return (
    <>
      {/* ── Backdrop ──────────────────────────────────────────────────── */}
      <Animated.View
        style={[styles.backdrop, { opacity: fadeAnim }]}
        pointerEvents={visible ? "auto" : "none"}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onReset} />
      </Animated.View>

      {/* ── Sheet ─────────────────────────────────────────────────────── */}
      <Animated.View
        style={[
          styles.sheet,
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* Drag Handle */}
        <View style={styles.handleContainer}>
          <View style={styles.handle} />
        </View>

        {/* ── Header ─────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.foodEmoji}>🍽️</Text>
            <View>
              <Text style={styles.foodName} numberOfLines={1}>
                {food_item || "Unknown Food"}
              </Text>
              <Text style={styles.servingLabel}>per 100g serving</Text>
            </View>
          </View>

          {/* Confidence Badge */}
          <View
            style={[
              styles.confidenceBadge,
              {
                backgroundColor:
                  confidencePercent >= 80
                    ? "rgba(16,185,129,0.2)"
                    : confidencePercent >= 60
                    ? "rgba(245,158,11,0.2)"
                    : "rgba(244,63,94,0.2)",
              },
            ]}
          >
            <Text
              style={[
                styles.confidenceText,
                {
                  color:
                    confidencePercent >= 80
                      ? "#6ee7b7"
                      : confidencePercent >= 60
                      ? "#fcd34d"
                      : "#fda4af",
                },
              ]}
            >
              {confidencePercent}% match
            </Text>
          </View>
        </View>

        {/* ── Macro Grid ─────────────────────────────────────────────── */}
        {nutrition ? (
          <View style={styles.macroGrid}>
            {MACRO_CARDS.map((card) => (
              <View
                key={card.key}
                style={[styles.macroCard, { backgroundColor: card.colors.bg }]}
              >
                <View style={styles.macroCardHeader}>
                  <Text style={styles.macroIcon}>{card.icon}</Text>
                  <Text
                    style={[styles.macroLabel, { color: card.colors.text }]}
                  >
                    {card.label}
                  </Text>
                </View>
                <Text
                  style={[styles.macroValue, { color: card.colors.text }]}
                >
                  {nutrition[card.field] ?? "—"}
                </Text>
                <Text
                  style={[styles.macroUnit, { color: card.colors.accent }]}
                >
                  {card.unit}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.noNutritionContainer}>
            <Text style={styles.noNutritionIcon}>📊</Text>
            <Text style={styles.noNutritionText}>
              Nutrition data not available for this item.
            </Text>
          </View>
        )}

        {/* ── Scan Another Button ────────────────────────────────────── */}
        <Pressable
          onPress={onReset}
          style={({ pressed }) => [
            styles.resetButton,
            pressed && styles.resetButtonPressed,
          ]}
          accessibilityLabel="Scan another food item"
          accessibilityRole="button"
        >
          <Text style={styles.resetButtonText}>🔄 Scan Another</Text>
        </Pressable>
      </Animated.View>
    </>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // ── Backdrop ────────────────────────────────────────────────────────────
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    zIndex: 20,
  },

  // ── Sheet ───────────────────────────────────────────────────────────────
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    backgroundColor: "#0f172a",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingBottom: 34,
    zIndex: 30,
    // iOS shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    // Android elevation
    elevation: 24,
    // Glassmorphism border
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "rgba(51,65,85,0.6)",
  },

  // ── Handle ──────────────────────────────────────────────────────────────
  handleContainer: {
    alignItems: "center",
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#475569",
  },

  // ── Header ──────────────────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    marginRight: 12,
  },
  foodEmoji: {
    fontSize: 32,
  },
  foodName: {
    color: "#f8fafc",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  servingLabel: {
    color: "#94a3b8",
    fontSize: 12,
    marginTop: 2,
    letterSpacing: 0.2,
  },
  confidenceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  confidenceText: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.2,
  },

  // ── Macro Grid ──────────────────────────────────────────────────────────
  macroGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  macroCard: {
    width: "47%",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  macroCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  macroIcon: {
    fontSize: 16,
  },
  macroLabel: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  macroValue: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  macroUnit: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 2,
    letterSpacing: 0.2,
  },

  // ── No Nutrition ────────────────────────────────────────────────────────
  noNutritionContainer: {
    alignItems: "center",
    paddingVertical: 24,
    marginBottom: 24,
  },
  noNutritionIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  noNutritionText: {
    color: "#94a3b8",
    fontSize: 14,
    textAlign: "center",
  },

  // ── Reset Button ────────────────────────────────────────────────────────
  resetButton: {
    backgroundColor: "#1e293b",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
  },
  resetButtonPressed: {
    backgroundColor: "#334155",
  },
  resetButtonText: {
    color: "#22d3ee",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
});
