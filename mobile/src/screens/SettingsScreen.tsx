import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useSession } from "../auth/session";
import { CURRENCIES, colors, radii } from "../theme/theme";
import { useFold } from "../hooks/useFold";
import { Text } from "../components/Text";
import { Card, Divider } from "../components/Card";
import { Button } from "../components/Button";
import { Avatar } from "../components/Avatar";
import { Chip } from "../components/Chip";
import { Screen } from "../components/Screen";

const DEMO_USERS = [
  { username: "addz", name: "Andrew" },
  { username: "maya", name: "Maya" },
  { username: "leo", name: "Leo" },
  { username: "sam", name: "Sam" },
  { username: "alex", name: "Alex" },
  { username: "nina", name: "Nina" },
  { username: "priya", name: "Priya" },
] as const;

export function SettingsScreen() {
  const { api, user, signOut, signIn } = useSession();
  const { mode } = useFold();
  const [switching, setSwitching] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const switchUser = async (username: string) => {
    if (username === user?.username) return;
    setSwitching(username);
    setError(null);
    try {
      await signIn(username);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not switch user");
    } finally {
      setSwitching(null);
    }
  };

  const currencies = Object.keys(CURRENCIES).slice(0, 8);

  return (
    <Screen scroll>
      <Text variant="title" style={{ marginBottom: 16 }}>
        Settings
      </Text>

      <Card style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <Avatar name={user?.displayName ?? "?"} color={user?.avatarColor} size={56} />
        <View style={{ flex: 1 }}>
          <Text variant="subtitle">{user?.displayName}</Text>
          <Text variant="caption">@{user?.username}</Text>
        </View>
        <Feather name="edit-3" size={20} color={colors.textFaint} />
      </Card>

      <Text variant="micro" style={styles.sectionLabel}>DEMO MODE</Text>
      {error ? <Text variant="caption" color={colors.danger} style={{ marginBottom: 8 }}>{error}</Text> : null}
      <View style={styles.chips}>
        {DEMO_USERS.map((u) => (
          <Chip key={u.username} label={`${u.name} (@${u.username})`} selected={u.username === user?.username} onPress={() => void switchUser(u.username)} color={colors.primary} />
        ))}
      </View>
      <Text variant="caption" style={styles.hint}>
        Tap someone else to sign in as them. Everyone shares one local demo database — no passwords.
      </Text>

      <Text variant="micro" style={styles.sectionLabel}>SERVER</Text>
      <Card>
        <View style={styles.infoRow}>
          <Ionicons name="server-outline" size={20} color={colors.primary} />
          <Text variant="body" style={{ flex: 1 }}>{api.baseUrl}</Text>
        </View>
        <Divider inset={0} style={{ marginVertical: 12 }} />
        <Text variant="caption" style={{ lineHeight: 19 }}>
          Override the API URL by setting EXPO_PUBLIC_API_URL before starting the app. On a physical phone,
          use your computer’s LAN address (e.g. http://192.168.1.10:4000). On the Android emulator use
          http://10.0.2.2:4000.
        </Text>
      </Card>

      <Text variant="micro" style={styles.sectionLabel}>CURRENCIES</Text>
      <View style={styles.chips}>
        {currencies.map((c) => (
          <Chip key={c} label={`${CURRENCIES[c]!.symbol} ${c}`} selected={false} />
        ))}
      </View>
      <Text variant="caption" style={styles.hint}>
        Each trip picks its own currency. Balances are kept perfectly exact in that currency’s minor units.
      </Text>

      <Text variant="micro" style={styles.sectionLabel}>ABOUT</Text>
      <Card>
        <View style={styles.infoRow}>
          <Ionicons name="phone-portrait-outline" size={20} color={colors.primary} />
          <Text variant="body" style={{ flex: 1 }}>Fold layout: {mode === "inner" ? "two-column ✓" : "single-column"}</Text>
        </View>
        <Divider inset={0} style={{ marginVertical: 12 }} />
        <View style={styles.infoRow}>
          <Ionicons name="layers-outline" size={20} color={colors.primary} />
          <Text variant="body" style={{ flex: 1 }}>Version 1.0.0</Text>
        </View>
        <Divider inset={0} style={{ marginVertical: 12 }} />
        <Text variant="caption">
          “Track the spending. We’ll handle the math.” Demo build — expenses and settlements are recorded, not
          charged; no real money moves.
        </Text>
      </Card>

      <Button variant="danger" block style={{ marginTop: 20 }} onPress={() => void signOut()}>
        Sign out
      </Button>
      <Text variant="caption" center style={{ marginTop: 14, marginBottom: 10 }}>
        Signed in as @{user?.username} · {new Date().getFullYear()} Splitly
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionLabel: { marginTop: 22, marginBottom: 10 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  hint: { marginTop: 8, lineHeight: 19 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12 },
});