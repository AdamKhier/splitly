import { Pressable, StyleSheet, View } from "react-native";
import { colors, spacing } from "../theme/theme";
import { Text } from "./Text";

interface EmptyStateProps {
  emoji?: string;
  title: string;
  detail?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ emoji = "🧾", title, detail, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.wrap}>
      <Text style={{ fontSize: 44 }}>{emoji}</Text>
      <Text variant="label" center style={{ marginTop: 8 }}>
        {title}
      </Text>
      {detail ? (
        <Text variant="body" color={colors.textMuted} center style={{ marginTop: 4, lineHeight: 20 }}>
          {detail}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} style={({ pressed }) => [styles.action, pressed && { opacity: 0.8 }]}>
          <Text variant="label" color={colors.primary} style={{ fontWeight: "700" }}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center", paddingVertical: 48, gap: spacing.xs },
  action: { marginTop: spacing.md, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 999, backgroundColor: colors.primarySoft },
});