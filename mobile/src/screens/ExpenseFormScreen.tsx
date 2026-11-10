import { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { useSession } from "../auth/session";
import { useData } from "../hooks/useData";
import { CURRENCIES, colors, radii, spacing } from "../theme/theme";
import { minorToMajorString } from "../lib/format";
import { Text } from "../components/Text";
import { Button } from "../components/Button";
import { Field } from "../components/Field";
import { Card } from "../components/Card";
import { Segmented } from "../components/Segmented";
import { Avatar } from "../components/Avatar";
import type { RootStackParamList } from "../nav/types";
import type { ExpenseView, TripDetail } from "../api/dto";

const CATEGORIES = ["food", "activities", "transport", "accommodation", "utilities", "shopping", "other"];
const SPLIT_OPTIONS = [
  { value: "equal", label: "Equal" },
  { value: "exact", label: "Exact" },
  { value: "percentage", label: "Percentage" },
] as const;

type SplitKind = (typeof SPLIT_OPTIONS)[number]["value"];

export function ExpenseFormScreen() {
  const { api } = useSession();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, "ExpenseForm">>();
  const { tripId, expenseId } = route.params;

  const tripFetch = useData(() => api.trip(tripId), [tripId]);
  const ed = useData(() => (expenseId ? api.expense(tripId, expenseId) : Promise.resolve(null)), [tripId, expenseId]);

  const trip: TripDetail | null = tripFetch.data?.trip ?? null;
  const editing: ExpenseView | null = ed.data?.expense ?? null;
  const meUser = useSessionUser();

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState<string | null>(null);
  const [category, setCategory] = useState("food");
  const [splitType, setSplitType] = useState<SplitKind>("equal");
  const [selected, setSelected] = useState<string[]>([]);
  const [exact, setExact] = useState<Record<string, string>>({});
  const [pcts, setPcts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prefill when editing or when the trip loads for a fresh expense.
  useEffect(() => {
    if (!trip) return;
    if (editing) {
      setDescription(editing.description);
      setAmount(minorToMajorString(editing.amountMinor, editing.currencyCode));
      setPaidBy(editing.paidByUserId);
      setCategory(editing.category);
      setSplitType(editing.splitType);
      const among = editing.shares.map((s) => s.userId);
      setSelected(among);
      const exactMap: Record<string, string> = {};
      const pctMap: Record<string, string> = {};
      for (const s of editing.shares) {
        exactMap[s.userId] = minorToMajorString(s.amountMinor, editing.currencyCode);
        pctMap[s.userId] = String(s.amountMinor / editing.amountMinor * 100);
      }
      setExact(exactMap);
      setPcts(pctMap);
    } else {
      setPaidBy(meUser?.id ?? trip.members[0]?.user.id ?? null);
      setSelected(trip.members.map((m) => m.user.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip?.trip.id, editing?.id]);

  const currency = trip?.trip.currencyCode ?? "AUD";
  const currencyMeta = CURRENCIES[currency] ?? CURRENCIES.AUD;

  const toggleSelected = useCallback((id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const splitReady =
    description.trim().length > 0 && Number(amount) > 0 && selected.length > 0 && paidBy !== null;

  const validate = (): string | null => {
    if (!description.trim()) return "Add a short description.";
    const amountMinor = Math.round(Number(amount) * 10 ** currencyMeta.minorUnits);
    if (!Number.isFinite(amountMinor) || amountMinor <= 0) return "Enter an amount greater than zero.";
    if (selected.length === 0) return "Pick at least one person to split with.";
    if (splitType === "exact") {
      const total = selected.reduce((s, id) => s + Math.round(Number(exact[id] ?? "0") * 10 ** currencyMeta.minorUnits), 0);
      if (total !== amountMinor) return `Exact shares add up to ${formatMajor(total, currency)} but the expense is ${formatMajor(amountMinor, currency)}.`;
    }
    if (splitType === "percentage") {
      const sum = selected.reduce((s, id) => s + (Number(pcts[id]) || 0), 0);
      if (Math.abs(sum - 100) > 0.01) return `Percentages add up to ${sum.toFixed(2)}% — make it 100%.`;
    }
    return null;
  };

  const save = async () => {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payload = {
        description: description.trim(),
        amount: Number(amount),
        category,
        paidByUserId: paidBy!,
        splitType,
        split: {
          among: selected,
          ...(splitType === "exact"
            ? { exact: Object.fromEntries(selected.map((id) => [id, Math.round(Number(exact[id] ?? "0") * 10 ** currencyMeta.minorUnits)])) }
            : {}),
          ...(splitType === "percentage"
            ? { percentages: Object.fromEntries(selected.map((id) => [id, Number(pcts[id]) || 0])) }
            : {}),
        },
      };
      if (editing) await api.updateExpense(tripId, editing.id, payload);
      else await api.createExpense(tripId, payload);
      navigation.goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save expense");
    } finally {
      setBusy(false);
    }
  };

  if (tripFetch.loading || (expenseId && ed.loading)) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" }}>
        <Text variant="caption">Loading…</Text>
      </SafeAreaView>
    );
  }
  if (!trip) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" }}>
        <Text variant="body" color={colors.danger}>
          Couldn’t load trip.
        </Text>
      </SafeAreaView>
    );
  }

  const equalShares = useMemo(() => {
    if (!(Number(amount) > 0) || selected.length === 0) return [];
    const unitMinor = Math.round((Number(amount) * 10 ** currencyMeta.minorUnits) / selected.length);
    return selected.map((id) => ({ id, value: minorToMajorString(unitMinor, currency) })).slice(0, 6);
  }, [amount, selected, currency, currencyMeta.minorUnits]);

  return (
    <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.header}>
        <Button variant="ghost" size="sm" onPress={() => navigation.goBack()}>
          Cancel
        </Button>
        <Text variant="label">{editing ? "Edit expense" : "New expense"}</Text>
        <Button variant="primary" size="sm" loading={busy} onPress={() => void save()} disabled={!splitReady && !error}>
          Save
        </Button>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <View style={{ gap: 16 }}>
          <Card style={styles.card}>
            <Field
              label="What was it for?"
              placeholder="e.g. Villa deposit"
              value={description}
              onChangeText={setDescription}
              autoFocus
            />
          </Card>

          <Card style={styles.card}>
            <Field
              label="Amount"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
              trailing={
                <Text variant="label" color={currency === "JPY" || currency === "KRW" ? colors.textFaint : colors.primary}>
                  {currencyMeta.symbol}
                </Text>
              }
            />
          </Card>

          <Card style={styles.card}>
            <Text variant="micro" style={styles.fieldLabel}>
              PAID BY
            </Text>
            <PersonRow trip={trip} selectedId={paidBy} onSelect={setPaidBy} single />
            <Text variant="micro" style={[styles.fieldLabel, { marginTop: 14 }]}>
              SPLIT BETWEEN
            </Text>
            <PersonRow trip={trip} selectedIds={selected} onToggle={toggleSelected} />
          </Card>

          <Card style={styles.card}>
            <Text variant="micro" style={styles.fieldLabel}>
              SPLIT TYPE
            </Text>
            <Segmented options={SPLIT_OPTIONS} value={splitType} onChange={setSplitType} />

            {splitType === "equal" && (
              <View style={{ marginTop: 14, gap: 6 }}>
                <Text variant="caption">
                  Split equally between {selected.length} {selected.length === 1 ? "person" : "people"}.
                </Text>
                {equalShares.map(({ id, value }) => (
                  <View key={id} style={styles.shareRow}>
                    <Text variant="body">{trip.usersById[id]?.displayName ?? "Unknown"}</Text>
                    <Text variant="label">{currencyMeta.symbol}{value}</Text>
                  </View>
                ))}
              </View>
            )}

            {splitType === "exact" && (
              <View style={{ marginTop: 14, gap: 6 }}>
                <Text variant="caption">Enter exactly what each person owes.</Text>
                {selected.map((id) => (
                  <View key={id} style={styles.shareRow}>
                    <Text variant="body" style={{ flex: 1 }}>
                      {trip.usersById[id]?.displayName ?? "Unknown"}
                    </Text>
                    <SmallAmountInput value={exact[id] ?? ""} onChange={(v) => setExact((p) => ({ ...p, [id]: v }))} prefix={currencyMeta.symbol} />
                  </View>
                ))}
              </View>
            )}

            {splitType === "percentage" && (
              <View style={{ marginTop: 14, gap: 6 }}>
                <Text variant="caption">Each person’s percentage of the total.</Text>
                {selected.map((id) => (
                  <View key={id} style={styles.shareRow}>
                    <Text variant="body" style={{ flex: 1 }}>
                      {trip.usersById[id]?.displayName ?? "Unknown"}
                    </Text>
                    <SmallAmountInput value={pcts[id] ?? ""} onChange={(v) => setPcts((p) => ({ ...p, [id]: v }))} suffix="%" />
                  </View>
                ))}
              </View>
            )}
          </Card>

          <Card style={styles.card}>
            <Text variant="micro" style={styles.fieldLabel}>
              CATEGORY
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {CATEGORIES.map((c) => (
                <CategoryPill key={c} label={c} active={category === c} onPress={() => setCategory(c)} />
              ))}
            </View>
          </Card>

          {error ? (
            <Card padded={false} style={{ backgroundColor: colors.dangerSoft, padding: 12, borderRadius: radii.md }}>
              <Text variant="caption" color={colors.danger} style={{ textAlign: "center" }}>
                {error}
              </Text>
            </Card>
          ) : null}

          <Button block size="lg" loading={busy} onPress={() => void save()}>
            {editing ? "Save changes" : "Add expense"}
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function useSessionUser() {
  const { user } = useSession();
  return user;
}

function PersonRow({
  trip,
  selectedId,
  selectedIds,
  onSelect,
  onToggle,
  single,
}: {
  trip: TripDetail;
  selectedId?: string | null;
  selectedIds?: string[];
  onSelect?: (id: string) => void;
  onToggle?: (id: string) => void;
  single?: boolean;
}) {
  return (
    <View style={styles.personList}>
      {trip.members.map((m) => {
        const active = single ? selectedId === m.user.id : selectedIds?.includes(m.user.id);
        return (
          <View key={m.user.id} style={styles.personRow}>
            <Avatar name={m.user.displayName} color={m.user.avatarColor} size={34} />
            <Text variant="body" style={{ flex: 1 }}>
              {m.user.displayName}
            </Text>
            <Ionicons
              name={active ? "checkmark-circle" : "ellipse-outline"}
              size={24}
              color={active ? colors.primary : colors.textFaint}
              style={{ padding: 4 }}
              role="button"
              aria-label={`Select ${m.user.displayName}`}
              onPress={() => (single ? onSelect?.(m.user.id) : onToggle?.(m.user.id))}
            />
          </View>
        );
      })}
    </View>
  );
}

function CategoryPill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <View
      role="button"
      aria-label={`Category ${label}`}
      onTouchEnd={onPress}
      style={[
        styles.catPill,
        { backgroundColor: active ? colors.primary : colors.bg, borderColor: active ? colors.primary : colors.border },
      ]}
    >
      <Text variant="micro" style={{ color: active ? colors.white : colors.textMuted }}>
        {label}
      </Text>
    </View>
  );
}

function SmallAmountInput({ value, onChange, prefix, suffix }: { value: string; onChange: (v: string) => void; prefix?: string; suffix?: string }) {
  return (
    <View style={styles.smallInputWrap}>
      {prefix ? (
        <Text variant="caption" color={colors.textMuted}>
          {prefix}
        </Text>
      ) : null}
      <Field value={value} onChangeText={onChange} keyboardType="decimal-pad" style={styles.smallInput} placeholder="0" />
      {suffix ? (
        <Text variant="caption" color={colors.textMuted}>
          {suffix}
        </Text>
      ) : null}
    </View>
  );
}

function formatMajor(minor: number, code: string): string {
  const meta = CURRENCIES[code] ?? CURRENCIES.AUD!;
  return `${meta.symbol}${(minor / 10 ** meta.minorUnits).toFixed(meta.minorUnits)}`;
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  content: { padding: 18, paddingBottom: 48, maxWidth: 640, width: "100%", alignSelf: "center", gap: 16 },
  card: { gap: 10 },
  fieldLabel: { textTransform: "uppercase", letterSpacing: 0.6 },
  personList: { gap: 4 },
  personRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
  shareRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 },
  smallInputWrap: { flexDirection: "row", alignItems: "center", gap: 6, width: 150 },
  smallInput: { paddingVertical: 8, paddingHorizontal: 10, fontSize: 15, minWidth: 90 },
  catPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
});