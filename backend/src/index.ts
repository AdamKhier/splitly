import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createApp } from "./api/app.ts";
import { JsonFileStore } from "./store/jsonStore.ts";
import { seedIfEmpty } from "./store/seed.ts";

const dataDir = process.env.SPLITLY_DATA_DIR ?? join(import.meta.dirname, "..", "data");
const store = new JsonFileStore(join(dataDir, "splitly.json"));

async function loadOrCreateSecret(): Promise<string> {
  const secretFile = join(dataDir, "secret.key");
  await mkdir(dataDir, { recursive: true });
  try {
    const existing = await readFile(secretFile, "utf8");
    if (existing.trim().length >= 16) return existing.trim();
  } catch {
    // generate fresh below
  }
  const secret = randomBytes(32).toString("hex");
  await writeFile(secretFile, secret, { mode: 0o600 });
  return secret;
}

async function main(): Promise<void> {
  const tokenSecret = process.env.SPLITLY_SECRET ?? (await loadOrCreateSecret());

  await store.load();
  const seeded = await seedIfEmpty(store);

  const port = Number(process.env.SPLITLY_PORT ?? 4000);
  const host = process.env.SPLITLY_HOST ?? "0.0.0.0";

  const app = createApp({ store, tokenSecret });
  const server = app.listen(port, host, () => {
    const db = store.snapshot();
    console.log(`➜ Splitly API ready on http://${host}:${port}`);
    console.log(`  seeded: ${seeded} (users=${db.users.length}, trips=${db.trips.length})`);
    console.log(`  demo: POST /api/auth/demo to enter as a user`);
  });

  const shutdown = (signal: string) => {
    console.log(`\n${signal} received, shutting down...`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 3000).unref();
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

void main().catch((err) => {
  console.error("Failed to start Splitly API:", err);
  process.exit(1);
});