import { Text as RNText, type TextProps, type TextStyle } from "react-native";
import { colors, fontSizes } from "../theme/theme";

type Variant = "display" | "title" | "subtitle" | "body" | "label" | "caption" | "micro";

const STYLES: Record<Variant, TextStyle> = {
  display: { fontSize: fontSizes.display, fontWeight: "800", color: colors.text },
  title: { fontSize: fontSizes.xxl, fontWeight: "800", color: colors.text },
  subtitle: { fontSize: fontSizes.xl, fontWeight: "700", color: colors.text },
  body: { fontSize: fontSizes.md, fontWeight: "400", color: colors.text },
  label: { fontSize: fontSizes.lg, fontWeight: "600", color: colors.text },
  caption: { fontSize: fontSizes.sm, fontWeight: "500", color: colors.textMuted },
  micro: { fontSize: fontSizes.xs, fontWeight: "600", color: colors.textMuted, letterSpacing: 0.4 },
};

interface AppTextProps extends TextProps {
  variant?: Variant;
  color?: string;
  center?: boolean;
}

export function Text({ variant = "body", color, center, style, ...props }: AppTextProps) {
  const base = STYLES[variant];
  return (
    <RNText
      {...props}
      style={[base, color ? { color } : {}, center ? { textAlign: "center" } : {}, style]}
    />
  );
}