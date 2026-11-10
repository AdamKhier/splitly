import { Text } from "./Text";
import { formatMoney } from "../lib/format";
import { colors } from "../theme/theme";

interface MoneyProps {
  minor: number;
  code: string;
  size?: "sm" | "md" | "lg";
  tone?: "auto" | "positive" | "negative" | "neutral";
}

export function Money({ minor, code, size = "md", tone = "auto" }: MoneyProps) {
  let color: string = colors.text;
  if (tone === "positive") color = colors.success;
  else if (tone === "negative") color = colors.danger;
  else if (tone === "auto") {
    if (minor > 0) color = colors.success;
    else if (minor < 0) color = colors.danger;
  }
  const fontSize = size === "lg" ? 20 : size === "sm" ? 14 : 16;
  return (
    <Text style={{ fontSize, fontWeight: "700", color, fontVariant: ["tabular-nums"] }}>
      {formatMoney(minor, code)}
    </Text>
  );
}