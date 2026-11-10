import type {
  AppNotification,
  Database,
  Expense,
  PaymentRequest,
  Settlement,
  Trip,
  TripMember,
  User,
} from "./types.ts";

/**
 * The Store is the single seam between the API and persistence. The JSON file
 * implementation lives in `jsonStore.ts`; a PostgreSQL implementation can
 * implement this same interface later without the API or engine changing.
 */
export interface Store {
  load(): Promise<void>;

  createUser(user: User): Promise<User>;
  updateUser(id: string, patch: Partial<User>): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  listUsers(query?: string, excludeId?: string): Promise<User[]>;

  createTrip(trip: Trip): Promise<Trip>;
  getTrip(id: string): Promise<Trip | undefined>;
  updateTrip(id: string, patch: Partial<Trip>): Promise<Trip | undefined>;
  deleteTrip(id: string): Promise<void>;
  listTrips(): Promise<Trip[]>;
  tripsForUser(userId: string): Promise<Trip[]>;

  addMember(member: TripMember): Promise<void>;
  removeMember(tripId: string, userId: string): Promise<void>;
  listMembers(tripId: string): Promise<TripMember[]>;
  isMember(tripId: string, userId: string): Promise<boolean>;

  createExpense(expense: Expense): Promise<Expense>;
  getExpense(id: string): Promise<Expense | undefined>;
  updateExpense(id: string, patch: Partial<Expense>): Promise<Expense | undefined>;
  deleteExpense(id: string): Promise<void>;
  listExpenses(tripId: string): Promise<Expense[]>;

  createSettlement(settlement: Settlement): Promise<Settlement>;
  getSettlement(id: string): Promise<Settlement | undefined>;
  updateSettlement(id: string, patch: Partial<Settlement>): Promise<Settlement | undefined>;
  deleteSettlement(id: string): Promise<void>;
  listSettlements(tripId: string): Promise<Settlement[]>;

  createRequest(request: PaymentRequest): Promise<PaymentRequest>;
  listRequests(tripId: string): Promise<PaymentRequest[]>;
  deleteRequest(id: string): Promise<void>;

  createNotification(n: AppNotification): Promise<AppNotification>;
  listNotifications(userId: string): Promise<AppNotification[]>;
  markNotificationRead(id: string, userId: string): Promise<AppNotification | undefined>;
  markAllNotificationsRead(userId: string): Promise<void>;

  snapshot(): Database;
  reset(): Promise<void>;
}