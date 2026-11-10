import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { useSession } from "../auth/session";
import { useData } from "../hooks/useData";
import { useFold, INNER_THRESHOLD } from "../hooks/useFold";
import { colors, radii, spacing } from "../theme/theme";
import { formatMoney, timeAgo, initials } from "../lib/format";
import { Text } from "../components/Text";
import { Card, Divider } from "../components/Card";
import { Button } from "../components/Button";
import { Avatar, AvatarStack } from "../components/Avatar";
import { Money } from "../components/Money";
import { Segmented } from "../components/Segmented";
import { Chip } from "../components/Chip";
import { Field } from "../components/Field";
import { SheetModal } from "../components/SheetModal";
import { EmptyState } from "../components/EmptyState";
import { LoadingView, ErrorView } from "../components/Screen";
import type { RootStackParamList } from "../nav/types";
import type { BalancesView, ExpenseView, SettlementView, TimelineEvent, TripDetail } from "../api/dto";

type Segment = "expenses" | "balances" | "settlements" | "activity";

const SEGMENTS = [
  { value: "expenses", label: "Expenses" },
  { value: "balances", label: "Balances" },
  { value: "settlements", label: "Settlements" },
  { value: "activity", label: "Activity" },
] as const;

export function TripDetailScreen() {
  const { api, user } = useSession();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, "Trip">>();
  const tripId = route.params.tripId;
  const { mode } = useFold();

  const [segment, setSegment] = useState<Segment>("expenses");
  const [selected, setSelected] = useState<string | null>(null);
  const [simplifyOverride, setSimplifyOverride] = useState<boolean | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settleOpen, setSettleOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);

  const tripData = useData(() => api.trip(tripId), [tripId]);
  const expensesData = useData(() => api.expenses(tripId), [tripId]);
  const balancesData = useData(() => api.balances(tripId, simplifyOverride ?? undefined), [tripId, simplifyOverride]);
  const settlementsData = useData(() => api.settlements(tripId), [tripId]);
  const activityData = useData(() => api.timeline(tripId), [tripId]);

  useFocusEffect(
    useCallback(() => {
      const t = setTimeout(() => {
        tripData.reload();
        expensesData.reload();
        balancesData.reload();
        settlementsData.reload();
        activityData.reload();
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, 250);
      return () => clearTimeout(t);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tripId]),
  );

  const trip = tripData.data?.trip;
  const expenses = expensesData.data?.expenses ?? [];
  const balances = balancesData.data?.balances;
  const settlements = settlementsData.data?.settlements ?? [];
  const events = activityData.data?.events ?? [];

  const refresh = useCallback(() => {
    tripData.reload();
    expensesData.reload();
    balancesData.reload();
    settlementsData.reload();
    activityData.reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId, simplifyOverride]);

  if (tripData.loading && !trip) return <LoadingView label="Loading trip…" />;
  if (!trip) {
    return (
      <ErrorView
        message={tripData.error ?? "Trip not found"}
        onRetry={() => tripData.reload()}
      />
    );
  }

  const currency = trip.trip.currencyCode;
  const disbursed = simplifyOverride ?? trip.trip.simplifyDebts;
  const selectedExpense = expenses.find((e) => e.id === selected);
  const selectedSettlement = settlements.find((s) => s.id === selected);
  const selectedBalanceMember = balances?.individuals.find((i) => i.userId === selected && selected.startsWith("bm_"));

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.header}>
        <ToolButton icon="chevron-back" onPress={() => navigation.goBack()} />
        <View style={{ flex: 1, marginLeft: 4 }}>
          <Text variant="label" numberOfLines={1}>
            {trip.trip.name}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 3 }}>
            <AvatarStack people={trip.members.map((m) => ({ id: m.user.id, name: m.user.displayName, color: m.user.avatarColor }))} size={22} />
            <Text variant="caption">{trip.trip.currencyCode}</Text>
          </View>
        </View>
        <ToolButton icon="settings-outline" onPress={() => setSettingsOpen(true)} />
      </View>

      {balances ? (
        <SummaryBanner
          me={balances.me}
          currency={currency}
          simplified={disbursed}
          onToggleSimplify={(v) => {
            setSimplifyOverride(v);
            api.updateTrip(tripId, { simplifyDebts: v }).catch(() => undefined);
          }}
        />
      ) : null}

      <View style={styles.segRow}>
        <Segmented options={SEGMENTS} value={segment} onChange={setSegment} />
      </View>

      {mode === "inner" ? (
        <View style={styles.innerSplit}>
          <ScrollView style={styles.innerList} contentContainerStyle={styles.innerListContent}>
            {segment === "expenses" && <ExpenseList trip={trip} expenses={expenses} currency={currency} meId={user?.id} selectedId={selected} onSelect={setSelected} onAdd={() => navigation.navigate("ExpenseForm", { tripId })} />}
            {segment === "balances" && <BalancesList balances={balances} currency={currency} meId={user?.id} selectedId={selected} onSelect={setSelected} simplified={disbursed} />}
            {segment === "settlements" && <SettlementList settlements={settlements} currency={currency} meId={user?.id} selectedId={selected} onSelect={setSelected} onAdd={() => setSettleOpen(true)} />}
            {segment === "activity" && <ActivityList events={events} currency={currency} onRefresh={refresh} />}
          </ScrollView>
          <View style={styles.innerDetail}>
            {segment === "expenses" ? (
              <ExpenseDetailPanel expense={selectedExpense} trip={trip} currency={currency} onEdit={(e) => navigation.navigate("ExpenseForm", { tripId, expenseId: e.id })} onDelete={async (e) => { await api.deleteExpense(tripId, e.id); setSelected(null); refresh(); }} onClose={() => setSelected(null)} />
            ) : segment === "balances" ? (
              <BalanceDetailPanel balances={balances} currency={currency} meId={user?.id} />
            ) : segment === "settlements" ? (
              <SettlementDetailPanel settlement={selectedSettlement} trip={trip} currency={currency} onMarkDone={async (s) => { await api.updateSettlement(tripId, s.id, { status: "complete" }); refresh(); }} onDelete={async (s) => { await api.deleteSettlement(tripId, s.id); setSelected(null); refresh(); }} onClose={() => setSelected(null)} onAdd={() => setSettleOpen(true)} />
            ) : (
              <View style={{ padding: 24 }}>
                <Text variant="caption">Activity</Text>
                <Text variant="body" color={colors.textMuted} style={{ marginTop: 8 }}>
                  Everything that happened in this trip, newest first.
                </Text>
              </View>
            )}
          </View>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 18, paddingBottom: 140 }}>
          {segment === "expenses" && <ExpenseList trip={trip} expenses={expenses} currency={currency} meId={user?.id} selectedId={selected} onSelect={setSelected} onAdd={() => navigation.navigate("ExpenseForm", { tripId })} />}
          {segment === "balances" && (
            <>
              <BalancesList balances={balances} currency={currency} meId={user?.id} selectedId={selected} onSelect={setSelected} simplified={disbursed} />
              {selectedExpense ? <View style={{ marginTop: 14 }}><ExpenseDetailPanel expense={selectedExpense} trip={trip} currency={currency} onEdit={(e) => navigation.navigate("ExpenseForm", { tripId, expenseId: e.id })} onDelete={async (e) => { await api.deleteExpense(tripId, e.id); setSelected(null); refresh(); }} onClose={() => setSelected(null)} /></View> : null}
              {selectedBalanceMember ? <BalanceDetailPanel balances={balances} currency={currency} meId={user?.id} /> : null}
            </>
          )}
          {segment === "settlements" && <SettlementList settlements={settlements} currency={currency} meId={user?.id} selectedId={selected} onSelect={setSelected} onAdd={() => setSettleOpen(true)} />}
          {segment === "activity" && <ActivityList events={events} currency={currency} onRefresh={refresh} />}
        </ScrollView>
      )}

      {user ? (
        <FABs segment={segment} onAddExpense={() => navigation.navigate("ExpenseForm", { tripId })} onAddSettlement={() => setSettleOpen(true)} onAddRequest={() => setRequestOpen(true)} />
      ) : null}

      <TripSettingsModal visible={settingsOpen} onClose={() => setSettingsOpen(false)} trip={trip} onChanged={() => { tripData.reload(); }} />
      <RecordSettlementModal visible={settleOpen} onClose={() => setSettleOpen(false)} trip={trip} onDone={() => { setSettleOpen(false); refresh(); }} />
      <RequestModal visible={requestOpen} onClose={() => setRequestOpen(false)} trip={trip} onDone={() => { setRequestOpen(false); activityData.reload(); expensesData.reload(); }} />
    </SafeAreaView>
  );
}

// ---------- shared pieces ----------

function ToolButton({ icon, onPress }: { icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.toolBtn, pressed && { opacity: 0.7 }]}>
      <Ionicons name={icon} size={22} color={colors.text} />
    </Pressable>
  );
}

function SummaryBanner({ me, currency, simplified, onToggleSimplify }: { me: BalancesView["me"]; currency: string; simplified: boolean; onToggleSimplify: (v: boolean) => void }) {
  const owed = me.toReceiveMinor > 0;
  const owe = me.toPayMinor > 0;
  return (
    <View style={styles.banner}>
      <View style={{ flex: 1 }}>
        {!owed && !owe ? (
          <>
            <Text variant="caption" style={{ color: colors.success }}>
              ALL SETTLED UP
            </Text>
            <Text variant="label" style={{ marginTop: 2 }}>
              You’re square with everyone.
            </Text>
          </>
        ) : owed ? (
          <>
            <Text variant="caption" style={{ color: colors.success }}>
              YOU’RE OWED
            </Text>
            <Money minor={me.toReceiveMinor} code={currency} size="lg" tone="positive" />
          </>
        ) : (
          <>
            <Text variant="caption" style={{ color: colors.danger }}>
              YOU OWE
            </Text>
            <Money minor={me.toPayMinor} code={currency} size="lg" tone="negative" />
          </>
        )}
      </View>
      <View style={{ alignItems: "flex-end", gap: 6 }}>
        <Text variant="micro">{simplified ? "SIMPLIFIED DEBTS" : "ITEMIZED DEBTS"}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text variant="caption">{simplified ? "On" : "Off"}</Text>
          <Switch value={simplified} onValueChange={onToggleSimplify} trackColor={{ true: colors.primary, false: colors.border }} thumbColor={colors.white} />
        </View>
      </View>
    </View>
  );
}

// ---------- expenses ----------

function ExpenseList({ trip, expenses, currency, meId, selectedId, onSelect, onAdd }: {
  trip: TripDetail; expenses: ExpenseView[]; currency: string; meId?: string | null; selectedId: string | null; onSelect: (id: string | null) => void; onAdd: () => void;
}) {
  if (expenses.length === 0) {
    return (
      <>
        <EmptyState emoji="🍹" title="Nothing split yet" detail="Add the first expense — a meal, a ride, a round of drinks." actionLabel="Add expense" onAction={onAdd} />
        <Button block onPress={onAdd} style={{ marginTop: 4 }}>Add expense</Button>
      </>
    );
  }
  return (
    <View style={{ gap: 10 }}>
      {expenses.map((e) => <ExpenseRow key={e.id} e={e} currency={currency} meId={meId} selected={selectedId === e.id} onSelect={() => onSelect(e.id)} />)}
      <Button variant="secondary" block onPress={onAdd} style={{ marginTop: 4 }}>
        Add expense
      </Button>
    </View>
  );
}

function ExpenseRow({ e, currency, meId, selected, onSelect }: { e: ExpenseView; currency: string; meId?: string | null; selected: boolean; onSelect: () => void }) {
  const myShare = e.shares.find((s) => s.userId === meId)?.amountMinor ?? null;
  const sub = e.paidBy.displayName;
  const isPayer = e.paidByUserId === meId;
  return (
    <Card onPress={onSelect} style={[styles.row, selected && styles.rowSelected]}>
      <View style={styles.rowIcon}>
        <Ionicons name="receipt-outline" size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="label" numberOfLines={1}>
          {e.description}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
          <Avatar name={e.paidBy.displayName} color={e.paidBy.avatarColor} size={18} />
          <Text variant="caption" numberOfLines={1}>
            {isPayer ? "You paid" : `${sub} paid`} · {timeAgo(e.occurredAt)}
          </Text>
        </View>
        {myShare !== null && !isPayer ? (
          <Text variant="caption" style={{ color: e.amountMinor / myShare >= 1 ? colors.textMuted : colors.success, marginTop: 2 }}>
            your share {formatMoney(myShare, currency)}
          </Text>
        ) : null}
      </View>
      <Money minor={e.amountMinor} code={currency} tone="neutral" size="lg" />
    </Card>
  );
}

function ExpenseDetailPanel({ expense, trip, currency, onEdit, onDelete, onClose }: {
  expense: ExpenseView | undefined; trip: TripDetail; currency: string; onEdit: (e: ExpenseView) => void; onDelete: (e: ExpenseView) => void; onClose: () => void;
}) {
  if (!expense) {
    return (
      <Card style={{ alignItems: "center", paddingVertical: 36 }}>
        <Text style={{ fontSize: 30 }}>👆</Text>
        <Text variant="caption" style={{ marginTop: 8 }}>Select an expense to see the breakdown.</Text>
      </Card>
    );
  }
  return (
    <Card>
      <HeaderClose onClose={onClose} />
      <Text variant="subtitle">{expense.description}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 }}>
        <Avatar name={expense.paidBy.displayName} color={expense.paidBy.avatarColor} size={30} />
        <Text variant="body">Paid by {expense.paidBy.displayName}</Text>
        <View style={{ flex: 1 }} />
        <Money minor={expense.amountMinor} code={expense.currencyCode} size="lg" tone="neutral" />
      </View>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
        <Chip label={expense.splitType} color={colors.primary} />
        <Chip label={expense.category} selected={false} />
        <Chip label={timeAgo(expense.occurredAt)} selected={false} />
      </View>
      <Divider inset={0} style={{ marginVertical: 14 }} />
      <Text variant="micro">HOW IT SPLITS</Text>
      {expense.shares.map((s) => (
        <View key={s.userId} style={styles.shareRow}>
          <Avatar name={s.user.displayName} color={s.user.avatarColor} size={26} />
          <Text variant="body" style={{ flex: 1, marginLeft: 8 }}>
            {s.user.displayName}
          </Text>
          <Text variant="label" style={{ fontVariant: ["tabular-nums"] }}>
            {formatMoney(s.amountMinor, expense.currencyCode)}
          </Text>
        </View>
      ))}
      <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
        <Button variant="secondary" size="sm" style={{ flex: 1 }} onPress={() => onEdit(expense)}>
          Edit
        </Button>
        <Button variant="danger" size="sm" style={{ flex: 1 }} onPress={() => onDelete(expense)}>
          Delete
        </Button>
      </View>
    </Card>
  );
}

function HeaderClose({ onClose }: { onClose?: () => void }) {
  if (!onClose) return null;
  return (
    <Pressable onPress={onClose} style={{ alignSelf: "flex-end", padding: 4 }}>
      <Ionicons name="close" size={20} color={colors.textMuted} />
    </Pressable>
  );
}

// ---------- balances ----------

function BalancesList({ balances, currency, meId, selectedId, onSelect, simplified }: {
  balances: BalancesView | undefined; currency: string; meId?: string | null; selectedId: string | null; onSelect: (id: string) => void; simplified: boolean;
}) {
  if (!balances) return <LoadingView />;
  if (balances.individuals.length === 0) {
    return <EmptyState emoji="🤝" title="Nothing to balance" detail="Add expenses to see who owes who." />;
  }
  return (
    <View style={{ gap: 12 }}>
      <View style={{ gap: 8 }}>
        {balances.individuals.map((i) => (
          <Card key={i.userId} onPress={() => onSelect(`bm_${i.userId}`)} style={[styles.row, selectedId === `bm_${i.userId}` && styles.rowSelected]}>
            <Avatar name={i.user.displayName} color={i.user.avatarColor} size={38} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text variant="label">
                {i.userId === meId ? `${i.user.displayName} (you)` : i.user.displayName}
              </Text>
              <Text variant="caption">
                paid {formatMoney(i.paidMinor, currency)} · share {formatMoney(i.shareMinor, currency)}
              </Text>
            </View>
            <Money minor={i.netMinor} code={currency} />
          </Card>
        ))}
      </View>

      <Text variant="micro" style={{ marginTop: 6 }}>
        {simplified ? "TO SETTLE (SIMPLIFIED — FEWEST TRANSFERS)" : "TO SETTLE (ITEMIZED)"}
      </Text>
      {balances.flows.length === 0 ? (
        <Text variant="caption" style={{ color: colors.success }}>
          All balances are even. 🎉
        </Text>
      ) : (
        <Card padded={false}>
          {balances.flows.map((f, idx) => (
            <View key={idx}>
              {idx > 0 ? <Divider inset={14} /> : null}
              <View style={styles.flowRow}>
                <Avatar name={f.fromUser.displayName} color={f.fromUser.avatarColor} size={28} />
                <Text variant="body" style={{ marginLeft: 8, flexShrink: 1 }}>
                  {f.fromUser.displayName}
                </Text>
                <Ionicons name="arrow-forward" size={16} color={colors.primary} />
                <Text variant="body" style={{ flexShrink: 1 }}>{f.toUser.displayName}</Text>
                <View style={{ flex: 1 }} />
                <Money minor={f.amountMinor} code={currency} tone="neutral" size="lg" />
              </View>
            </View>
          ))}
        </Card>
      )}
    </View>
  );
}

function BalanceDetailPanel({ balances, currency, meId }: { balances: BalancesView | undefined; currency: string; meId?: string | null }) {
  if (!balances) return <Card><Text variant="caption">Select a person to drill in.</Text></Card>;
  return (
    <Card>
      <Text variant="micro">GROUP TOTALS</Text>
      <View style={{ gap: 4, marginTop: 8 }}>
        <Row label="Total spent" value={formatMoney(balances.totals.paidMinor, currency)} />
        <Row label="Split across everyone" value={formatMoney(balances.totals.shareMinor, currency)} />
      </View>
      <Divider style={{ marginVertical: 12 }} />
      <Text variant="micro">HEADLINE NUMBERS</Text>
      {balances.individuals.slice(0, 8).map((i) => (
        <Row key={i.userId} label={i.userId === meId ? `${i.user.displayName} (you)` : i.user.displayName} value={<Money minor={i.netMinor} code={currency} />} />
      ))}
    </Card>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 6 }}>
      <Text variant="body" style={{ flex: 1 }}>{label}</Text>
      {typeof value === "string" ? <Text variant="label">{value}</Text> : value}
    </View>
  );
}

// ---------- settlements ----------

function SettlementList({ settlements, currency, meId, selectedId, onSelect, onAdd }: {
  settlements: SettlementView[]; currency: string; meId?: string | null; selectedId: string | null; onSelect: (id: string) => void; onAdd: () => void;
}) {
  if (settlements.length === 0) {
    return <EmptyState emoji="💸" title="No settlements yet" detail="Record when someone pays someone back to keep the ledger accurate." actionLabel="Record settlement" onAction={onAdd} />;
  }
  return (
    <View style={{ gap: 10 }}>
      {settlements.map((s) => (
        <Card key={s.id} onPress={() => onSelect(s.id)} style={[styles.row, selectedId === s.id && styles.rowSelected]}>
          <View style={[styles.rowIcon, { backgroundColor: s.status === "complete" ? colors.successSoft : colors.primarySoft }]}>
            <Ionicons name={s.status === "complete" ? "checkmark-circle" : "time-outline"} size={20} color={s.status === "complete" ? colors.success : colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="label" numberOfLines={1}>
              {s.fromUser.displayName} → {s.toUser.displayName}
            </Text>
            <Text variant="caption">{s.method} · {s.status === "complete" ? "settled" : "pending"}</Text>
          </View>
          <Money minor={s.amountMinor} code={currency} tone="neutral" />
        </Card>
      ))}
      <Button variant="secondary" block onPress={onAdd}>Record settlement</Button>
    </View>
  );
}

function SettlementDetailPanel({ settlement, trip, currency, onMarkDone, onDelete, onClose, onAdd }: {
  settlement: SettlementView | undefined; trip: TripDetail; currency: string; onMarkDone: (s: SettlementView) => void; onDelete: (s: SettlementView) => void; onClose: () => void; onAdd: () => void;
}) {
  if (!settlement) {
    return (
      <View style={{ gap: 10, padding: 8 }}>
        <View style={{ padding: 24, backgroundColor: colors.surface, borderRadius: radii.lg, alignItems: "center" }}>
          <Text style={{ fontSize: 30 }}>💸</Text>
          <Text variant="caption" style={{ marginTop: 8 }}>Select a settlement to inspect it, or record a new one.</Text>
        </View>
        <Button onPress={onAdd}>Record settlement</Button>
      </View>
    );
  }
  void trip;
  return (
    <Card>
      <HeaderClose onClose={onClose} />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Avatar name={settlement.fromUser.displayName} color={settlement.fromUser.avatarColor} size={32} />
        <Text variant="body">{settlement.fromUser.displayName} → {settlement.toUser.displayName}</Text>
      </View>
      <Money minor={settlement.amountMinor} code={currency} size="lg" tone="neutral" />
      <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
        <Chip label={settlement.method} selected={false} />
        <Chip label={settlement.status} color={settlement.status === "complete" ? colors.success : colors.warn} />
      </View>
      {settlement.note ? <Text variant="body" style={{ marginTop: 10 }}>{settlement.note}</Text> : null}
      {settlement.status === "pending" ? (
        <Button variant="success" block style={{ marginTop: 14 }} onPress={() => onMarkDone(settlement)}>
          Mark as paid
        </Button>
      ) : null}
      <Button variant="danger" size="sm" style={{ marginTop: 8 }} onPress={() => onDelete(settlement)}>
        Delete record
      </Button>
    </Card>
  );
}

// ---------- activity ----------

function ActivityList({ events, currency, onRefresh }: { events: TimelineEvent[]; currency: string; onRefresh: () => void }) {
  if (events.length === 0) return <EmptyState emoji="🕰️" title="No activity yet" />;
  const icon = (t: TimelineEvent["type"]): keyof typeof Ionicons.glyphMap =>
    t === "expense" ? "receipt-outline" : t === "settlement" ? "swap-horizontal" : "notifications-outline";
  const color = (t: TimelineEvent["type"]) =>
    t === "expense" ? colors.primary : t === "settlement" ? colors.success : colors.warn;
  return (
    <View style={{ gap: 8 }}>
      {events.map((ev, i) => (
        <Card key={`${ev.id}-${i}`} style={styles.activityRow}>
          <View style={[styles.rowIcon, { backgroundColor: color(ev.type) + "22" }]}>
            <Ionicons name={icon(ev.type)} size={18} color={color(ev.type)} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="label" numberOfLines={1}>
              {ev.title}
            </Text>
            <Text variant="caption" numberOfLines={1}>{ev.detail} · {timeAgo(ev.happenedAt)}</Text>
          </View>
          {ev.amountMinor !== undefined ? <Money minor={ev.amountMinor} code={ev.currencyCode ?? currency} tone="neutral" /> : null}
        </Card>
      ))}
      <Button variant="ghost" block onPress={onRefresh}>Refresh</Button>
    </View>
  );
}

// ---------- FAB ----------

function FABs({ segment, onAddExpense, onAddSettlement, onAddRequest }: { segment: Segment; onAddExpense: () => void; onAddSettlement: () => void; onAddRequest: () => void }) {
  return (
    <View style={styles.fabRow}>
      {segment === "expenses" && <FAB label="Expense" icon="add" onPress={onAddExpense} />}
      {segment === "settlements" && <FAB label="Settle" icon="swap-horizontal" onPress={onAddSettlement} />}
      <FAB label="Request" icon="notifications" onPress={onAddRequest} secondary />
    </View>
  );
}

function FAB({ label, icon, onPress, secondary }: { label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void; secondary?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.fab, secondary && styles.fabSecondary, pressed && { opacity: 0.85 }]}>
      <Ionicons name={icon} size={18} color={secondary ? colors.primary : colors.white} />
      <Text variant="label" style={{ color: secondary ? colors.primary : colors.white, fontSize: 14 }}>
        {label}
      </Text>
    </Pressable>
  );
}

// ---------- modals ----------

function TripSettingsModal({ visible, onClose, trip, onChanged }: {
  visible: boolean; onClose: () => void; trip: TripDetail; onChanged: () => void;
}) {
  const { api, user } = useSession();
  const [name, setName] = useState(trip.trip.name);
  const [description, setDescription] = useState(trip.trip.description ?? "");
  const [addUser, setAddUser] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.updateTrip(trip.trip.id, { name: name.trim(), description: description.trim() || null });
      onChanged();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  };

  const addMember = async () => {
    if (!addUser.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api.addMember(trip.trip.id, { username: addUser.trim() });
      setAddUser("");
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add member");
    } finally {
      setBusy(false);
    }
  };

  const removeMember = async (userId: string) => {
    try {
      await api.removeMember(trip.trip.id, userId);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove");
    }
  };

  const done = async () => {
    try {
      await api.deleteTrip(trip.trip.id);
      onClose();
      // navigate away: the parent screen will error and show retry; fine for demo
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete");
    }
  };

  return (
    <SheetModal visible={visible} onClose={onClose} maxWidth={480}>
      <Text variant="subtitle">Trip settings</Text>
      <ScrollView keyboardShouldPersistTaps="handled" style={{ marginTop: 14 }}>
        <View style={{ gap: 14 }}>
          <Field label="Trip name" value={name} onChangeText={setName} />
          <Field label="Description" value={description} onChangeText={setDescription} placeholder="Optional" />

          <View style={{ gap: 8 }}>
            <Text variant="micro">MEMBERS ({trip.members.length})</Text>
            {trip.members.map((m) => (
              <View key={m.user.id} style={styles.memberRow}>
                <Avatar name={m.user.displayName} color={m.user.avatarColor} size={32} />
                <Text variant="body" style={{ flex: 1, marginLeft: 10 }}>
                  {m.user.displayName} {m.user.id === user?.id ? "· you" : ""}
                </Text>
                {m.user.id !== trip.trip.createdByUserId && m.user.id !== user?.id ? (
                  <Pressable onPress={() => removeMember(m.user.id)} style={{ padding: 6 }}>
                    <Ionicons name="person-remove-outline" size={20} color={colors.danger} />
                  </Pressable>
                ) : null}
              </View>
            ))}
            <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
              <View style={{ flex: 1 }}>
                <Field placeholder="username (e.g. maya)" value={addUser} onChangeText={setAddUser} autoCapitalize="none" />
              </View>
              <Button variant="secondary" onPress={() => void addMember()} loading={busy} style={{ alignSelf: "flex-end" }}>
                Add
              </Button>
            </View>
          </View>

          {error ? (
            <Text variant="caption" color={colors.danger}>{error}</Text>
          ) : null}

          <View style={{ flexDirection: "row", gap: 10 }}>
            <Button variant="secondary" style={{ flex: 1 }} onPress={() => void save()} loading={busy}>
              Save
            </Button>
            <Button variant="danger" style={{ flex: 1 }} onPress={() => void done()}>
              Delete trip
            </Button>
          </View>
        </View>
      </ScrollView>
    </SheetModal>
  );
}

const METHODS = ["cash", "bank", "payid", "card", "other"] as const;

function RecordSettlementModal({ visible, onClose, trip, onDone }: {
  visible: boolean; onClose: () => void; trip: TripDetail; onDone: () => void;
}) {
  const { api, user } = useSession();
  const members = trip.members.map((m) => m.user);
  const others = members.filter((m) => m.id !== user?.id);
  const [from, setFrom] = useState(user?.id ?? members[0]?.id ?? "");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("other");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!from || !to || from === to) {
      setError("Pick two different people.");
      return;
    }
    if (!(Number(amount) > 0)) {
      setError("Enter an amount.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.createSettlement(trip.trip.id, { fromUserId: from, toUserId: to, amount: Number(amount), method });
      setAmount("");
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not record settlement");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SheetModal visible={visible} onClose={onClose} maxWidth={460}>
      <Text variant="subtitle">Record settlement</Text>
      <Text variant="caption" style={{ marginTop: 2, marginBottom: 16 }}>
        Who paid whom, and how much? This settles part of the outstanding balance.
      </Text>
      <View style={{ gap: 14 }}>
        {!to ? (
          <PickerField label="WHO PAID?" members={members} value={from} onChange={setFrom} placeholder="Choose" />
        ) : (
          <>
            <PickerField label="WHO PAID?" members={members} value={from} onChange={setFrom} placeholder="Choose" />
            <Text variant="micro">→ PAID {amount || "…"} TO</Text>
            <PickerField label="" members={others} value={to} onChange={setTo} placeholder="Choose" />
          </>
        )}
        <Field
          label="Amount"
          placeholder="0.00"
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
          trailing={<Text variant="label" color={colors.primary}>{trip.trip.currencyCode}</Text>}
        />
        <View style={{ gap: 8 }}>
          <Text variant="micro">METHOD</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {METHODS.map((m) => (
              <Chip key={m} label={m} selected={method === m} onPress={() => setMethod(m)} />
            ))}
          </View>
        </View>
        {error ? <Text variant="caption" color={colors.danger}>{error}</Text> : null}
        <Button block loading={busy} onPress={() => void submit()}>
          Save settlement
        </Button>
      </View>
    </SheetModal>
  );
}

function PickerField({ label, members, value, onChange, placeholder }: {
  label: string; members: Array<Pick<import("../api/dto").ApiUser, "id" | "displayName" | "avatarColor">>; value: string; onChange: (id: string) => void; placeholder: string;
}) {
  return (
    <View style={{ gap: 6 }}>
      {label ? <Text variant="micro">{label}</Text> : null}
      <View style={styles.pickerGrid}>
        {members.map((m) => (
          <Pressable key={m.id} onPress={() => onChange(m.id)} style={[styles.pickerItem, value === m.id && styles.pickerItemActive]}>
            <Avatar name={m.displayName} color={m.avatarColor} size={26} />
            <Text variant="caption" numberOfLines={1} style={value === m.id ? { color: colors.white } : {}}>
              {m.displayName}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function RequestModal({ visible, onClose, trip, onDone }: {
  visible: boolean; onClose: () => void; trip: TripDetail; onDone: () => void;
}) {
  const { api, user } = useSession();
  const others = trip.members.filter((m) => m.user.id !== user?.id).map((m) => m.user);
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!to || !(Number(amount) > 0)) {
      setError("Pick who to ask, and how much.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.createRequest(trip.trip.id, {
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
    <SheetModal visible={visible} onClose={onClose} maxWidth={460}>
      <Text variant="subtitle">Request payment</Text>
      <Text variant="caption" style={{ marginTop: 2, marginBottom: 16 }}>
        Ask for money, share the request with the person via in-app notification.
      </Text>
      <View style={{ gap: 14 }}>
        <PickerField label="ASK WHO?" members={others} value={to} onChange={setTo} placeholder="Who" />
        <Field
          label="Amount"
          placeholder="0.00"
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
          trailing={<Text variant="label" color={colors.primary}>{trip.trip.currencyCode}</Text>}
        />
        <Field label="Note (optional)" placeholder="e.g. burner top-up" value={message} onChangeText={setMessage} />
        {error ? <Text variant="caption" color={colors.danger}>{error}</Text> : null}
        <Button block loading={busy} onPress={() => void submit()}>
          Send request
        </Button>
      </View>
    </SheetModal>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, gap: 6 },
  toolBtn: { padding: 8, borderRadius: radii.pill, backgroundColor: colors.surface },
  segRow: { paddingHorizontal: 18, marginTop: 12, marginBottom: 6 },
  banner: {
    marginHorizontal: 18,
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: 16,
    gap: 12,
  },
  innerSplit: { flex: 1, flexDirection: "row", paddingHorizontal: 18, gap: 14, marginTop: 6 },
  innerList: { flex: 1, maxWidth: 460 },
  innerListContent: { paddingBottom: 24 },
  innerDetail: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  rowSelected: { borderWidth: 2, borderColor: colors.primary },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  shareRow: { flexDirection: "row", alignItems: "center", paddingVertical: 5 },
  flowRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, gap: 4 },
  activityRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  fabRow: { position: "absolute", right: 18, bottom: 24, flexDirection: "row", gap: 10 },
  fab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
    ...{ shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  },
  fabSecondary: { backgroundColor: colors.surface },
  memberRow: { flexDirection: "row", alignItems: "center" },
  pickerGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pickerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    maxWidth: 170,
  },
  pickerItemActive: { backgroundColor: colors.primary, borderColor: colors.primary },
});