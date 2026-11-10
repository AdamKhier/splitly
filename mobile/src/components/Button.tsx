import { ActivityIndicator, Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import { colors, radii, spacing } from "../theme/theme";
import { Text } from "./Text";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends Omit<PressableProps, "children" | "style"> {
  children: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  block?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

const SIZE_PADDING: Record<Size, { v: number; h: number; label: "label" | "body" }> = {
  sm: { v: 8, h: 12, label: "label" },
  md: { v: 12, h: 18, label: "label" },
  lg: { v: 16, h: 22, label: "label" },
};

const VARIANTS: Record<Variant, { bg: string; fg: string; border?: string }> = {
  primary: { bg: colors.primary, fg: colors.white },
  secondary: { bg: colors.primarySoft, fg: colors.primaryDark },
  ghost: { bg: "transparent", fg: colors.primaryDark },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
  success: { bg: colors.success, fg: colors.white },
};

export function Button({ children, variant = "primary", size = "md", loading, block, icon, disabled, style, ...rest }: ButtonProps) {
  const v = VARIANTS[variant];
  const s = SIZE_PADDING[size];
  const containerStyle: StyleProp<ViewStyle> | undefined = [
    {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      paddingVertical: s.v,
      paddingHorizontal: s.h,
      borderRadius: radii.pill,
      backgroundColor: v.bg,
      ...(v.border ? { borderWidth: 1, borderColor: v.border } : {}),
      opacity: disabled || loading ? 0.55 : 1,
    },
    block ? { alignSelf: "stretch" } : {},
    style,
  ];

  return (
    <Pressable
      disabled={disabled || loading}
      style={({ pressed }) => [containerStyle, pressed && { opacity: 0.85 }] as StyleProp<ViewStyle>}
      {...rest}
    >
      {loading ? <ActivityIndicator size="small" color={v.fg} /> : icon}
      <Text variant={s.label} color={v.fg} style={{ fontWeight: "700" }}>
        {children}
      </Text>
    </Pressable>
  );
}