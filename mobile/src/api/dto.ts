export type SplitType = "equal" | "exact" | "percentage";

export interface ApiUser {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  avatarColor: string;
}

export interface TripListItem {
  trip: {
    id: string;
    name: string;
    description?: string;
    currencyCode: string;
    simplifyDebts: boolean;
    createdByUserId: string;
    createdAt: string;
  };
  members: MemberView[];
  memberCount: number;
  expenseCount: number;
  netMinor: number;
  toReceiveMinor: number;
  toPayMinor: number;
}

export interface MemberView {
  user: ApiUser;
  joinedAt: string;
}

export interface TripDetail {
  trip: {
    id: string;
    name: string;
    description?: string;
    currencyCode: string;
    simplifyDebts: boolean;
    createdByUserId: string;
    createdAt: string;
  };
  members: MemberView[];
  usersById: Record<string, ApiUser>;
  expenseCount: number;
  settlementCount: number;
}

export interface ExpenseShare {
  userId: string;
  user: ApiUser;
  amountMinor: number;
}

export interface ExpenseView {
  id: string;
  tripId: string;
  description: string;
  category: string;
  amountMinor: number;
  currencyCode: string;
  paidByUserId: string;
  paidBy: ApiUser;
  splitType: SplitType;
  splitInput?: { kind: "exact"; exactShares: Record<string, number> } | { kind: "percentage"; percentages: Record<string, number> };
  shares: ExpenseShare[];
  occurredAt: string;
  createdAt: string;
}

export interface BalancesView {
  simplified: boolean;
  individuals: Array<{
    userId: string;
    user: ApiUser;
    paidMinor: number;
    shareMinor: number;
    netMinor: number;
  }>;
  flows: Array<{
    from: string;
    to: string;
    amountMinor: number;
    expenseId?: string;
    fromUser: ApiUser;
    toUser: ApiUser;
  }>;
  totals: { paidMinor: number; shareMinor: number };
  me: { userId: string; netMinor: number; toReceiveMinor: number; toPayMinor: number };
}

export type SettlementStatus = "pending" | "complete";
export type SettlementMethod = "cash" | "bank" | "payid" | "card" | "other";

export interface SettlementView {
  id: string;
  tripId: string;
  fromUserId: string;
  toUserId: string;
  amountMinor: number;
  currencyCode: string;
  method: SettlementMethod;
  note?: string;
  status: SettlementStatus;
  createdAt: string;
  completedAt?: string;
  fromUser: ApiUser;
  toUser: ApiUser;
}

export interface RequestView {
  id: string;
  tripId: string;
  fromUser: ApiUser;
  toUser: ApiUser;
  amountMinor: number;
  currencyCode: string;
  message?: string;
  createdAt: string;
}

export type NotificationKind =
  | "payment_requested"
  | "expense_added"
  | "payment_settled"
  | "balance_settled"
  | "trip_invite";

export interface NotificationView {
  id: string;
  userId: string;
  kind: NotificationKind;
  tripId?: string;
  tripName?: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export interface TimelineEvent {
  id: string;
  type: "expense" | "settlement" | "request" | "member";
  happenedAt: string;
  title: string;
  detail: string;
  amountMinor?: number;
  currencyCode?: string;
}