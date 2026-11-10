import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
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
import { emptyDatabase } from "./types.ts";
import type { Store } from "./store.ts";

/**
 * JSON-file-backed Store. One file holds the whole database (fine for the demo
 * stage). Writes are atomic (write temp, rename) and happen synchronously per
 * mutation so the file always reflects the last applied change.
 */
export class JsonFileStore implements Store {
  private db: Database = emptyDatabase();
  private dirty = false;
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  async load(): Promise<void> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as Database;
      this.db = { ...emptyDatabase(), ...parsed };
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        this.db = emptyDatabase();
      } else {
        throw err;
      }
    }
  }

  private async save(): Promise<void> {
    if (!this.dirty) return;
    const tmp = `${this.filePath}.tmp`;
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(tmp, JSON.stringify(this.db, null, 2), "utf8");
    await rename(tmp, this.filePath);
    this.dirty = false;
  }

  snapshot(): Database {
    return this.db;
  }

  async reset(): Promise<void> {
    this.db = emptyDatabase();
    this.dirty = true;
    await this.save();
  }

  // --- users ---

  async createUser(user: User): Promise<User> {
    this.db.users.push(user);
    this.dirty = true;
    await this.save();
    return user;
  }

  async updateUser(id: string, patch: Partial<User>): Promise<User | undefined> {
    const user = this.db.users.find((u) => u.id === id);
    if (!user) return undefined;
    Object.assign(user, patch);
    this.dirty = true;
    await this.save();
    return user;
  }

  async getUserById(id: string): Promise<User | undefined> {
    return this.db.users.find((u) => u.id === id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const target = username.trim().toLowerCase();
    return this.db.users.find((u) => u.username.toLowerCase() === target);
  }

  async listUsers(query?: string, excludeId?: string): Promise<User[]> {
    const q = query?.trim().toLowerCase() ?? "";
    return this.db.users
      .filter((u) => (excludeId ? u.id !== excludeId : true))
      .filter((u) =>
        q.length === 0
          ? true
          : u.displayName.toLowerCase().includes(q) ||
            u.username.toLowerCase().includes(q) ||
            (u.email ?? "").toLowerCase().includes(q),
      );
  }

  // --- trips ---

  async createTrip(trip: Trip): Promise<Trip> {
    this.db.trips.push(trip);
    this.dirty = true;
    await this.save();
    return trip;
  }

  async getTrip(id: string): Promise<Trip | undefined> {
    return this.db.trips.find((t) => t.id === id);
  }

  async updateTrip(id: string, patch: Partial<Trip>): Promise<Trip | undefined> {
    const trip = this.db.trips.find((t) => t.id === id);
    if (!trip) return undefined;
    Object.assign(trip, patch);
    this.dirty = true;
    await this.save();
    return trip;
  }

  async deleteTrip(id: string): Promise<void> {
    this.db.trips = this.db.trips.filter((t) => t.id !== id);
    this.db.members = this.db.members.filter((m) => m.tripId !== id);
    this.db.expenses = this.db.expenses.filter((e) => e.tripId !== id);
    this.db.settlements = this.db.settlements.filter((s) => s.tripId !== id);
    this.db.requests = this.db.requests.filter((r) => r.tripId !== id);
    this.dirty = true;
    await this.save();
  }

  async listTrips(): Promise<Trip[]> {
    return [...this.db.trips];
  }

  async tripsForUser(userId: string): Promise<Trip[]> {
    const tripIds = new Set(
      this.db.members.filter((m) => m.userId === userId).map((m) => m.tripId),
    );
    return this.db.trips.filter((t) => tripIds.has(t.id));
  }

  // --- members ---

  async addMember(member: TripMember): Promise<void> {
    const exists = this.db.members.some(
      (m) => m.tripId === member.tripId && m.userId === member.userId,
    );
    if (!exists) {
      this.db.members.push(member);
      this.dirty = true;
      await this.save();
    }
  }

  async removeMember(tripId: string, userId: string): Promise<void> {
    const before = this.db.members.length;
    this.db.members = this.db.members.filter(
      (m) => !(m.tripId === tripId && m.userId === userId),
    );
    if (this.db.members.length !== before) {
      this.dirty = true;
      await this.save();
    }
  }

  async listMembers(tripId: string): Promise<TripMember[]> {
    return this.db.members.filter((m) => m.tripId === tripId);
  }

  async isMember(tripId: string, userId: string): Promise<boolean> {
    return this.db.members.some((m) => m.tripId === tripId && m.userId === userId);
  }

  // --- expenses ---

  async createExpense(expense: Expense): Promise<Expense> {
    this.db.expenses.push(expense);
    this.dirty = true;
    await this.save();
    return expense;
  }

  async getExpense(id: string): Promise<Expense | undefined> {
    return this.db.expenses.find((e) => e.id === id);
  }

  async updateExpense(id: string, patch: Partial<Expense>): Promise<Expense | undefined> {
    const expense = this.db.expenses.find((e) => e.id === id);
    if (!expense) return undefined;
    Object.assign(expense, patch);
    this.dirty = true;
    await this.save();
    return expense;
  }

  async deleteExpense(id: string): Promise<void> {
    const before = this.db.expenses.length;
    this.db.expenses = this.db.expenses.filter((e) => e.id !== id);
    if (this.db.expenses.length !== before) {
      this.dirty = true;
      await this.save();
    }
  }

  async listExpenses(tripId: string): Promise<Expense[]> {
    return this.db.expenses.filter((e) => e.tripId === tripId);
  }

  // --- settlements ---

  async createSettlement(settlement: Settlement): Promise<Settlement> {
    this.db.settlements.push(settlement);
    this.dirty = true;
    await this.save();
    return settlement;
  }

  async getSettlement(id: string): Promise<Settlement | undefined> {
    return this.db.settlements.find((s) => s.id === id);
  }

  async updateSettlement(id: string, patch: Partial<Settlement>): Promise<Settlement | undefined> {
    const settlement = this.db.settlements.find((s) => s.id === id);
    if (!settlement) return undefined;
    Object.assign(settlement, patch);
    this.dirty = true;
    await this.save();
    return settlement;
  }

  async deleteSettlement(id: string): Promise<void> {
    const before = this.db.settlements.length;
    this.db.settlements = this.db.settlements.filter((s) => s.id !== id);
    if (this.db.settlements.length !== before) {
      this.dirty = true;
      await this.save();
    }
  }

  async listSettlements(tripId: string): Promise<Settlement[]> {
    return this.db.settlements.filter((s) => s.tripId === tripId);
  }

  // --- payment requests ---

  async createRequest(request: PaymentRequest): Promise<PaymentRequest> {
    this.db.requests.push(request);
    this.dirty = true;
    await this.save();
    return request;
  }

  async listRequests(tripId: string): Promise<PaymentRequest[]> {
    return this.db.requests.filter((r) => r.tripId === tripId);
  }

  async deleteRequest(id: string): Promise<void> {
    const before = this.db.requests.length;
    this.db.requests = this.db.requests.filter((r) => r.id !== id);
    if (this.db.requests.length !== before) {
      this.dirty = true;
      await this.save();
    }
  }

  // --- notifications ---

  async createNotification(n: AppNotification): Promise<AppNotification> {
    this.db.notifications.push(n);
    this.dirty = true;
    await this.save();
    return n;
  }

  async listNotifications(userId: string): Promise<AppNotification[]> {
    return this.db.notifications
      .filter((n) => n.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async markNotificationRead(id: string, userId: string): Promise<AppNotification | undefined> {
    const n = this.db.notifications.find((x) => x.id === id && x.userId === userId);
    if (!n) return undefined;
    n.read = true;
    this.dirty = true;
    await this.save();
    return n;
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    let changed = false;
    for (const n of this.db.notifications) {
      if (n.userId === userId && !n.read) {
        n.read = true;
        changed = true;
      }
    }
    if (changed) {
      this.dirty = true;
      await this.save();
    }
  }
}