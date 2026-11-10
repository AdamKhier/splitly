import { Pressable, StyleSheet, View } from "react-native";
import { colors, radii, spacing } from "../theme/theme";
import { Text } from "./Text";

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  color?: string;
}

export function Chip({ label, selected, onPress, color }: ChipProps) {
  const bg = selected ? color ?? colors.primary : colors.surface;
  const fg = selected ? colors.white : colors.textMuted;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: bg, borderColor: selected ? bg : colors.border },
        pressed && { opacity: 0.8 },
      ]}
    >
      <Text variant="micro" style={{ color: fg, fontSize: 12 }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
});

export function ChipRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
      {options.map((o) => (
        <Chip key={o} label={o} selected={o === value} onPress={() => onChange(o)} />
      ))}
    </View>
  );
}