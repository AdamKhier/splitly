import type { ReactNode } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../theme/theme";
import { Text } from "./Text";
import { EmptyState } from "./EmptyState";

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: StyleProp<ViewStyle>;
  keyboardDismiss?: "none" | "interactive" | "on-drag";
}

export function Screen({ children, scroll = true, refreshing, onRefresh, contentStyle, keyboardDismiss = "none" }: ScreenProps) {
  if (!scroll) {
    return (
      <SafeAreaView edges={["top"]} style={styles.flex}>
        <View style={[styles.content, contentStyle, { flex: 1 }]}>{children}</View>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView edges={["top"]} style={styles.flex}>
      <ScrollView
        style={styles.flex}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={keyboardDismiss}
        contentContainerStyle={[styles.content, contentStyle]}
        refreshControl={refreshing !== undefined ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} /> : undefined}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 18, paddingBottom: 32 },
});

export function LoadingView({ label = "Loading…" }: { label?: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12, backgroundColor: colors.bg }}>
      <ActivityIndicator size="large" color={colors.primary} />
      <ActivityIndicator size="small" />
      <Text variant="caption">{label}</Text>
    </View>
  );
}

export function ErrorView({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <EmptyState emoji="😕" title="Something went wrong" detail={message} actionLabel={onRetry ? "Try again" : undefined} onAction={onRetry} />
  );
}