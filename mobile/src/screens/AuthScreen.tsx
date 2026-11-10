import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii, spacing } from "../theme/theme";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { Field } from "../components/Field";
import { Text } from "../components/Text";
import { useSession } from "../auth/session";

export function AuthScreen() {
  const { signIn, api } = useSession();
  const [busy, setBusy] = useState(false);
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);

  const enterAs = async (user?: string) => {
    setBusy(true);
    setError(null);
    try {
      await signIn(user, username.trim() || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.flex}>
      <View style={styles.wrap}>
        <View style={styles.hero}>
          <View style={styles.logoMark}>
            <Ionicons name="swap-horizontal" size={40} color={colors.white} />
          </View>
          <Text variant="display" style={{ marginTop: 18 }}>
            Splitly
          </Text>
          <Text variant="body" color={colors.textMuted} center style={{ marginTop: 6, lineHeight: 22 }}>
            Track the spending. We’ll handle the math.
          </Text>
        </View>

        <View style={{ gap: spacing.lg }}>
          <Card style={styles.card}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={styles.demoBadge}>
                <Text style={{ fontSize: 18 }}>👋</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="label">Continue as Andrew</Text>
                <Text variant="caption">The ready-made demo account with trips already in it.</Text>
              </View>
            </View>
            <Button block loading={busy} onPress={() => enterAs("addz")} style={{ marginTop: 14 }}>
              Enter demo
            </Button>
          </Card>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={styles.line} />
            <Text variant="micro">OR</Text>
            <View style={styles.line} />
          </View>

          <Card>
            <Field
              label="Another demo account"
              placeholder="e.g. maya, leo, sam"
              autoCapitalize="none"
              autoCorrect={false}
              value={username}
              onChangeText={setUsername}
              onSubmitEditing={() => enterAs(username)}
              error={error ?? undefined}
              hint="Any of the seeded accounts work — or enter a new name to create one."
            />
            <Button block variant="secondary" loading={busy} onPress={() => enterAs(username)} style={{ marginTop: 14 }}>
              Continue
            </Button>
          </Card>
        </View>

        <Text variant="caption" center style={{ marginTop: 24 }}>
          Real accounts & sign-in are coming later — this is the demo stage.
        </Text>
        <Text variant="micro" center style={{ marginTop: 12 }} color={colors.textFaint}>
          API → {api.baseUrl}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  wrap: { padding: spacing.xl, paddingTop: 48, gap: spacing.xl, maxWidth: 520, width: "100%", alignSelf: "center" },
  hero: { alignItems: "center" },
  logoMark: {
    width: 84,
    height: 84,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...{ shadowColor: colors.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 18, elevation: 8 },
  },
  card: { borderRadius: radii.lg },
  demoBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
});