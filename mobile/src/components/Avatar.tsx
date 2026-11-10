import { StyleSheet, View } from "react-native";
import { colors } from "../theme/theme";
import { initials } from "../lib/format";
import { Text } from "./Text";

function hashHue(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return h;
}

interface AvatarProps {
  name: string;
  color?: string;
  size?: number;
  emoji?: string;
}

export function Avatar({ name, color, size = 40, emoji }: AvatarProps) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color ?? colors.primary,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        variant="label"
        color={colors.white}
        style={{ fontSize: Math.max(11, size * 0.36), fontWeight: "700" }}
      >
        {emoji ?? initials(name || "?")}
      </Text>
    </View>
  );
}

export function AvatarStack({
  people,
  max = 4,
  size = 30,
}: {
  people: Array<{ id: string; name: string; color?: string }>;
  max?: number;
  size?: number;
}) {
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  return (
    <View style={styles.stack}>
      {shown.map((p, i) => (
        <View key={p.id} style={{ marginLeft: i === 0 ? 0 : -size / 3, zIndex: shown.length - i }}>
          <Avatar name={p.name} color={p.color ?? `hsl(${hashHue(p.id)},60%,55%)`} size={size} />
        </View>
      ))}
      {extra > 0 && (
        <View
          style={{
            marginLeft: -size / 3,
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: colors.border,
            alignItems: "center",
            justifyContent: "center",
            zIndex: 0,
          }}
        >
          <Text variant="caption" style={{ fontSize: Math.max(10, size * 0.32) }}>
            +{extra}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({ stack: { flexDirection: "row", alignItems: "center" } });