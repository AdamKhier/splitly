import { Pressable, StyleSheet, View } from "react-native";
import { colors, radii } from "../theme/theme";
import { Text } from "./Text";

interface SegmentedProps<T extends string> {
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
}

export function Segmented<T extends string>({ options, value, onChange }: SegmentedProps<T>) {
  return (
    <View style={styles.container}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[styles.seg, selected && styles.segSelected]}
          >
            <Text variant="micro" style={[selected ? styles.selectedText : styles.text, { fontSize: 13 }]}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: colors.bg,
    borderRadius: radii.pill,
    padding: 4,
  },
  seg: {
    flex: 1,
    paddingVertical: 9,
    alignItems: "center",
    borderRadius: radii.pill - 2,
  },
  segSelected: {
    backgroundColor: colors.surface,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  selectedText: { color: colors.text, fontWeight: "700" },
  text: { color: colors.textMuted, fontWeight: "600" },
});