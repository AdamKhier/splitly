import { useCallback, useState } from "react";
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSession } from "../auth/session";
import { useData } from "../hooks/useData";
import { useFold, INNER_THRESHOLD } from "../hooks/useFold";
import { colors, radii, spacing } from "../theme/theme";
import { formatMoney } from "../lib/format";
import { Screen, LoadingView, ErrorView } from "../components/Screen";
import { Card } from "../components/Card";
import { AvatarStack } from "../components/Avatar";
import { Money } from "../components/Money";
import { Button } from "../components/Button";
import { Field } from "../components/Field";
import { Chip } from "../components/Chip";
import { SheetModal } from "../components/SheetModal";
import { Text } from "../components/Text";
import type { RootStackParamList, MainTabsParamList } from "../nav/types";
import type { TripListItem } from "../api/dto";

const CURRENCY_OPTIONS = ["AUD", "USD", "EUR", "GBP", "NZD", "SGD", "THB", "JPY"];

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function TripsScreen() {
  const { api, user } = useSession();
  const navigation = useNavigation<Nav>();
  const { mode } = useFold();
  const [createOpen, setCreateOpen] = useState(false);
  const { data, loading, refreshing, error, reload } = useData(() => api.myTrips(), []);

  const trips = data?.trips ?? [];

  return (
    <Screen refreshing={refreshing} onRefresh={reload} contentStyle={{ paddingBottom: 120 }}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text variant="micro">WELCOME BACK</Text>
          <Text variant="title" style={{ marginTop: 2 }}>
            Your trips
          </Text>
        </View>
        <TripCreateButton onPress={() => setCreateOpen(true)} />
      </View>

      {loading ? (
        <LoadingView />
      ) : error ? (
        <ErrorView message={error} onRetry={reload} />
      ) : trips.length === 0 ? (
        <View style={{ marginTop: 20 }}>
          <TripEmpty onCreate={() => setCreateOpen(true)} />
        </View>
      ) : (
        <View style={[styles.grid, mode === "inner" && { flexDirection: "row", flexWrap: "wrap" }]}>
          {trips.map((item) => (
            <TripCard key={item.trip.id} item={item} mode={mode} onPress={() => navigation.navigate("Trip", { tripId: item.trip.id })} />
          ))}
        </View>
      )}

      <CreateTripModal visible={createOpen} onClose={() => setCreateOpen(false)} />
    </Screen>
  );
}

function TripCreateButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.newTripBtn, pressed && { opacity: 0.85 }]}>
      <Ionicons name="add" size={22} color={colors.white} />
      <Text variant="label" color={colors.white} style={{ fontSize: 15, fontWeight: "700" }}>
        New trip
      </Text>
    </Pressable>
  );
}

function TripCard({ item, mode, onPress }: { item: TripListItem; mode: "cover" | "inner"; onPress: () => void }) {
  const isOwed = item.toReceiveMinor > 0;
  const owes = item.toPayMinor > 0;
  const people = item.members.map((m) => ({ id: m.user.id, name: m.user.displayName, color: m.user.avatarColor }));
  return (
    <View style={[styles.gridItem, mode === "inner" && { width: "48%" }]}>
      <Card onPress={onPress} style={styles.tripCard}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <View style={{ flex: 1 }}>
            <Text variant="subtitle" numberOfLines={1}>
              {item.trip.name}
            </Text>
            {item.trip.description ? (
              <Text variant="caption" numberOfLines={1} style={{ marginTop: 1 }}>
                {item.trip.description}
              </Text>
            ) : null}
          </View>
          <View style={styles.currencyPill}>
            <Text variant="micro">{item.trip.currencyCode}</Text>
          </View>
        </View>

        <View style={styles.cardMeta}>
          <AvatarStack people={people} size={28} />
          <Text variant="caption">{item.memberCount} people · {item.expenseCount} expenses</Text>
        </View>

        <View
          style={[
            styles.balanceBanner,
            !isOwed && !owes && { backgroundColor: colors.successSoft, borderColor: colors.successSoft },
          ]}
        >
          {isOwed ? (
            <View style={styles.balanceInner}>
              <Ionicons name="trending-up" size={16} color={colors.success} />
              <Text variant="caption" style={{ flex: 1 }}>
                You’re owed
              </Text>
              <Money minor={item.toReceiveMinor} code={item.trip.currencyCode} tone="positive" />
            </View>
          ) : owes ? (
            <View style={styles.balanceInner}>
              <Ionicons name="trending-down" size={16} color={colors.danger} />
              <Text variant="caption" style={{ flex: 1 }}>
                You owe
              </Text>
              <Money minor={item.toPayMinor} code={item.trip.currencyCode} tone="negative" />
            </View>
          ) : (
            <View style={styles.balanceInner}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text variant="caption" color={colors.success} style={{ flex: 1 }}>
                All settled up
              </Text>
            </View>
          )}
        </View>
      </Card>
    </View>
  );
}

function TripEmpty({ onCreate }: { onCreate: () => void }) {
  return (
    <Card style={{ alignItems: "center", paddingVertical: 40 }}>
      <Text style={{ fontSize: 40 }}>✈️</Text>
      <Text variant="label" style={{ marginTop: 10 }}>
        No trips yet
      </Text>
      <Text variant="body" color={colors.textMuted} center style={{ marginTop: 4 }}>
        Trips and groups are where expenses, balances and settlements live.
      </Text>
      <Button variant="secondary" onPress={onCreate} style={{ marginTop: 18 }}>
        Create your first trip
      </Button>
    </Card>
  );
}

function CreateTripModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { api } = useSession();
  const { width } = useWindowDimensions();
  const navigation = useNavigation<Nav>();
  const isInner = width >= INNER_THRESHOLD;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [currency, setCurrency] = useState("AUD");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async () => {
    if (!name.trim()) {
      setError("Give the trip a name.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await api.createTrip({
        name: name.trim(),
        ...(description.trim() ? { description: description.trim() } : {}),
        currencyCode: currency,
      });
      setName("");
      setDescription("");
      setCurrency("AUD");
      onClose();
      navigation.navigate("Trip", { tripId: result.trip.trip.id });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create trip");
    } finally {
      setBusy(false);
    }
  }, [api, name, description, currency, navigation, onClose]);

  return (
    <SheetModal visible={visible} onClose={onClose} maxWidth={440}>
      <Text variant="subtitle">New trip</Text>
      <Text variant="caption" style={{ marginTop: 2, marginBottom: 16 }}>
        Trips group the people, expenses and maths together.
      </Text>
      <View style={{ gap: 14 }}>
        <Field label="Trip name" placeholder="e.g. Bali Trip 2026" value={name} onChangeText={setName} autoFocus={!isInner} />
        <Field label="Description (optional)" placeholder="Seminyak villa with the crew" value={description} onChangeText={setDescription} />
        <View style={{ gap: 6 }}>
          <Text variant="micro" style={{ textTransform: "uppercase", letterSpacing: 0.6 }}>
            Currency
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {CURRENCY_OPTIONS.map((c) => (
              <Chip key={c} label={c} selected={currency === c} onPress={() => setCurrency(c)} />
            ))}
          </View>
        </View>
        {error ? (
          <Text variant="caption" color={colors.danger}>
            {error}
          </Text>
        ) : null}
        <Button block loading={busy} onPress={() => void submit()} style={{ marginTop: 4 }}>
          Create trip
        </Button>
      </View>
    </SheetModal>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  newTripBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.pill,
  },
  grid: { gap: 14, flexDirection: "column" },
  gridItem: { width: "100%" },
  tripCard: { gap: 12 },
  currencyPill: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 2 },
  balanceBanner: {
    marginTop: 4,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  balanceInner: { flexDirection: "row", alignItems: "center", gap: 6 },
});