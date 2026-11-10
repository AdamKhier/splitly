import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useSession } from "../auth/session";
import { useData } from "../hooks/useData";
import { useFold } from "../hooks/useFold";
import { colors, radii } from "../theme/theme";
import { timeAgo } from "../lib/format";
import { Text } from "../components/Text";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { Avatar } from "../components/Avatar";
import { Money } from "../components/Money";
import { Field } from "../components/Field";
import { SheetModal } from "../components/SheetModal";
import { Segmented } from "../components/Segmented";
import { EmptyState } from "../components/EmptyState";
import { LoadingView, ErrorView } from "../components/Screen";
import type { NotificationView, RequestView, TripListItem } from "../api/dto";

type IncomingSource = { notification: NotificationView; trip?: TripListItem };

export function RequestsScreen() {
  const { api, user } = useSession();
  const navigation = useNavigation();
  const { mode } = useFold();

  const [tab, setTab] = useState<"incoming" | "sent">("incoming");
  const [sent, setSent] = useState<Array<{ request: RequestView; trip: TripListItem }> | null>(null);
  const [sentLoading, setSentLoading] = useState(true);
  const [newOpen, setNewOpen] = useState(false);

  const notes = useData(() => api.notifications(), []);
  const trips = useData(() => api.myTrips(), []);

  const loadSent = useCallback(async () => {
    setSentLoading(true);
    try {
      const myTrips = await api.myTrips();
      const rows = await Promise.all(
        myTrips.trips.map(async (t) => {
          const res = await api.requests(t.trip.id);
          return res.requests.map((r) => ({ request: r, trip: t }));
        }),
      );
      setSent(rows.flat().sort((a, b) => b.request.createdAt.localeCompare(a.request.createdAt)));
    } catch {
      setSent([]);
    } finally {
      setSentLoading(false);
    }
  }, [api]);

  useFocusEffect(
    useCallback(() => {
      notes.reload();
      trips.reload();
      void loadSent();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loadSent]),
  );

  const incoming = useMemo<IncomingSource[]>(() => {
    const list: IncomingSource[] = [];
    for (const n of notes.data?.notifications ?? []) {
      if (n.kind !== "payment_requested") continue;
      const trip = trips.data?.trips.find((t) => t.trip.id === n.tripId);
      list.push({ notification: n, trip });
    }
    return list.sort((a, b) => b.notification.createdAt.localeCompare(a.notification.createdAt));
  }, [notes.data, trips.data]);

  const markRead = async (id: string) => {
    await api.markNotificationRead(id).catch(() => undefined);
    notes.reload();
  };

  const openTrip = (tripId?: string) => {
    if (tripId) navigation.navigate("Trip", { tripId });
  };

  if (notes.loading && !notes.data) return <LoadingView label="Loading requests…" />;
  if (notes.error && !notes.data) return <ErrorView message={notes.error} onRetry={() => notes.reload()} />;

  const incomingCount = incoming.length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.header}>
        <Text variant="title">Requests</Text>
        <Pressable onPress={() => setNewOpen(true)} style={styles.headerBtn}>
          <Ionicons name="paper-plane" size={20} color={colors.white} />
        </Pressable>
      </View>

      <View style={styles.segWrap}>
        <Segmented
          options={[
            { value: "incoming" as const, label: `To me${incomingCount ? ` (${incomingCount})` : ""}` },
            { value: "sent" as const, label: "Sent" },
          ]}
          value={tab}
          onChange={setTab}
        />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 18, paddingBottom: 140 }}>
        {tab === "incoming" ? (
          incoming.length === 0 ? (
            <EmptyState
              emoji="🫶"
              title="Nothing asked of you"
              detail="Whoever asks someone for money in a trip you share will show up here."
              actionLabel="Ask for money"
              onAction={() => setNewOpen(true)}
            />
          ) : (
            <View style={{ gap: 10 }}>
              {incoming.map(({ notification, trip }) => {
                const body = notification.body;
                return (
                  <Card key={notification.id} style={{ gap: 8 }}>
                    <Pressable onPress={() => void markRead(notification.id)}>
                      {readAffordance(notification.read)}
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        <View style={styles.iconWrap}>
                          <Ionicons name="arrow-down" size={20} color={colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text variant="label">{body}</Text>
                          <Text variant="caption" numberOfLines={1}>
                            {notification.title} · {timeAgo(notification.createdAt)}
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      {trip ? (
                        <Pressable onPress={() => openTrip(trip.trip.id)} style={styles.tripPill}>
                          <Text variant="micro" style={{ color: colors.primary }}>
                            {trip.trip.name}
                          </Text>
                        </Pressable>
                      ) : null}
                      <View style={{ flex: 1 }} />
                      <Button size="sm" onPress={() => void markRead(notification.id)}>
                        Done
                      </Button>
                    </View>
                  </Card>
                );
              })}
            </View>
          )
        ) : sentLoading ? (
          <LoadingView label="Loading sent requests…" />
        ) : sent && sent.length === 0 ? (
          <EmptyState
            emoji="📨"
            title="Nothing sent yet"
            detail="Ask someone for money and it'll show up here until they settle it."
            actionLabel="Send a request"
            onAction={() => setNewOpen(true)}
          />
        ) : (
          <View style={{ gap: 10 }}>
            {sent?.map(({ request, trip }) => (
              <Card key={request.id} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Avatar name={request.toUser.displayName} color={request.toUser.avatarColor} size={36} />
                <View style={{ flex: 1 }}>
                  <Text variant="label" numberOfLines={1}>
                    {request.toUser.displayName}
                  </Text>
                  <Text variant="caption" numberOfLines={1}>
                    {trip.trip.name} · {request.message ?? "no note"} · {timeAgo(request.createdAt)}
                  </Text>
                  <Pressable onPress={() => openTrip(trip.trip.id)} style={{ marginTop: 6 }}>
                    <Text variant="micro" style={{ color: colors.primary }}>
                      Open trip →
                    </Text>
                  </Pressable>
                </View>
                <Money minor={request.amountMinor} code={request.currencyCode} tone="neutral" size="lg" />
              </Card>
            ))}
          </View>
        )}
      </ScrollView>

      <NewRequestModal visible={newOpen} onClose={() => setNewOpen(false)} onDone={() => { setNewOpen(false); void loadSent(); notes.reload(); }} />
    </View>
  );
}

function readAffordance(read: boolean) {
  if (read) return null;
  return <View style={{ position: "absolute", top: -4, right: -8, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary }} />;
}

function NewRequestModal({ visible, onClose, onDone }: { visible: boolean; onClose: () => void; onDone: () => void }) {
  const { api, user } = useSession();
  const [trips, setTrips] = useState<TripListItem[] | null>(null);
  const [tripId, setTripId] = useState("");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible && !trips) {
      api.myTrips().then((res) => {
        setTrips(res.trips);
        if (!tripId && res.trips.length > 0) setTripId(res.trips[0].trip.id);
      }).catch(() => setTrips([]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, trips]);

  const activeTrip = trips?.find((t) => t.trip.id === tripId);
  const members = activeTrip ? activeTrip.members.map((m) => m.user).filter((m) => m.id !== user?.id) : [];

  const submit = async () => {
    if (!tripId || !to || !(Number(amount) > 0)) {
      setError("Pick a trip, someone to ask, and an amount.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.createRequest(tripId, {
        toUserId: to,
        amount: Number(amount),
        ...(message.trim() ? { message: message.trim() } : {}),
      });
      setAmount("");
      setMessage("");
      setTo("");
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send request");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SheetModal visible={visible} onClose={onClose} maxWidth={480}>
      <Text variant="subtitle">Ask someone for money</Text>
      <ScrollView keyboardShouldPersistTaps="handled" style={{ marginTop: 14 }}>
        <View style={{ gap: 14 }}>
          <View style={{ gap: 6 }}>
            <Text variant="micro">IN WHICH TRIP?</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {trips === null ? <Text variant="caption">Loading trips…</Text> : trips.length === 0 ? <Text variant="caption">No trips yet.</Text> : trips.map((t) => (
                <Pressable key={t.trip.id} onPress={() => { setTripId(t.trip.id); setTo(""); }} style={[styles.tripChip, t.trip.id === tripId && styles.tripChipActive]}>
                  <Text variant="micro" style={{ color: t.trip.id === tripId ? colors.white : colors.textMuted }}>
                    {t.trip.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <View style={{ gap: 6 }}>
            <Text variant="micro">WHO?</Text>
            <View style={styles.memberWrap}>
              {members.map((m) => (
                <Pressable key={m.id} onPress={() => setTo(m.id)} style={[styles.memberChip, to === m.id && styles.memberChipActive]}>
                  <Avatar name={m.displayName} color={m.avatarColor} size={24} />
                  <Text variant="caption" numberOfLines={1} style={{ maxWidth: 120, color: to === m.id ? colors.white : colors.text }}>
                    {m.displayName}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <Field
            label="How much"
            placeholder="0.00"
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
            trailing={<Text variant="label" color={colors.primary}>{activeTrip?.trip.currencyCode ?? ""}</Text>}
          />
          <Field label="Note (optional)" placeholder="e.g. dinner split" value={message} onChangeText={setMessage} />
          {error ? <Text variant="caption" color={colors.danger}>{error}</Text> : null}
          <Button block loading={busy} onPress={() => void submit()}>
            Send request
          </Button>
        </View>
      </ScrollView>
    </SheetModal>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingTop: 12, paddingBottom: 8 },
  headerBtn: { width: 40, height: 40, borderRadius: radii.pill, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  segWrap: { paddingHorizontal: 18, marginBottom: 4 },
  iconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  tripPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radii.pill, backgroundColor: colors.primarySoft },
  tripChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radii.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  tripChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  memberWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  memberChip: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.pill, paddingVertical: 6, paddingHorizontal: 12 },
  memberChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
});