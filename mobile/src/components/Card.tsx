import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { Pressable, View } from "react-native";
import { colors, radii, shadows } from "../theme/theme";

interface CardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  padded?: boolean;
}

export function Card({ children, style, onPress, padded = true }: CardProps) {
  const base: StyleProp<ViewStyle> = [
    { backgroundColor: colors.surface, borderRadius: radii.lg, ...shadows.card },
    padded && { padding: 16 },
    style,
  ];
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [base, pressed && { transform: [{ scale: 0.985 }], opacity: 0.92 }]}>
        {children}
      </Pressable>
    );
  }
  return <View style={base}>{children}</View>;
}

export function Divider({ inset = 0, style }: { inset?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ height: 1, backgroundColor: colors.border, marginLeft: inset }, style]} />;
}