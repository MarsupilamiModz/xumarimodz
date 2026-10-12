import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getCloudflareContext } from "@opennextjs/cloudflare";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/** Läuft der Code in Cloudflare Workers (OpenNext) statt in Node? */
const isWorkers = typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";

/**
 * Prisma-Engine-Parameter (pgbouncer, connection_limit) kennt `pg` nicht. Ohne sslmode hat die
 * Prisma-Engine SSL versucht („prefer“); `pg` nimmt dann gar kein SSL – deshalb für entfernte Hosts
 * verschlüsselt ohne Zertifikatsprüfung (Supabase-Pooler). Hyperdrive verbindet lokal ohne SSL.
 */
function createAdapter(url: string, max: number, viaHyperdrive = false) {
  const parsed = new URL(url);
  parsed.searchParams.delete("pgbouncer");
  parsed.searchParams.delete("connection_limit");
  const explicitSsl = parsed.searchParams.has("sslmode") || parsed.searchParams.has("ssl");
  const local = /^(localhost|127\.0\.0\.1|::1)$/.test(parsed.hostname);
  return new PrismaPg({
    connectionString: parsed.toString(),
    max,
    ...(explicitSsl || local || viaHyperdrive ? {} : { ssl: { rejectUnauthorized: false } }),
  });
}

function createPrismaClient(url: string, max: number, viaHyperdrive = false) {
  return new PrismaClient({
    adapter: createAdapter(url, max, viaHyperdrive),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

/**
 * Node (next start, Build, Skripte): ein Client pro Prozess. Beim `next build` rendern mehrere
 * Worker parallel vor – höchstens 2 Verbindungen pro Worker, sonst EMAXCONN.
 */
function nodeClient() {
  if (!globalForPrisma.prisma) {
    const max = process.env.NEXT_PHASE === "phase-production-build" ? 2 : 10;
    globalForPrisma.prisma = createPrismaClient(process.env.DATABASE_URL ?? "", max);
  }
  return globalForPrisma.prisma;
}

/**
 * Workers: Sockets gehören zum Request, der sie geöffnet hat, und dürfen nicht wiederverwendet
 * werden. Deshalb ein Client pro Request (Schlüssel: ExecutionContext). Mit Hyperdrive-Binding
 * kommt der Verbindungsaufbau aus dessen Pool und kostet kaum Zeit.
 */
const requestClients = new WeakMap<object, PrismaClient>();

function workersClient() {
  const { env, ctx } = getCloudflareContext();
  let client = requestClients.get(ctx);
  if (!client) {
    const hyperdrive = (env as { HYPERDRIVE?: { connectionString: string } }).HYPERDRIVE;
    client = hyperdrive
      ? createPrismaClient(hyperdrive.connectionString, 5, true)
      : createPrismaClient(process.env.DATABASE_URL ?? "", 5);
    requestClients.set(ctx, client);
  }
  return client;
}

function currentClient(): PrismaClient {
  return isWorkers ? workersClient() : nodeClient();
}

/** Gleiche API wie bisher (`prisma.user.findMany …`), löst aber je Laufzeit den passenden Client auf. */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = currentClient();
    const value = Reflect.get(client, prop, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

const warmed = new WeakMap<PrismaClient, Promise<void>>();

/** Warm connection before critical auth paths (pooler cold start). */
export async function warmDbConnection() {
  const client = currentClient();
  let pending = warmed.get(client);
  if (!pending) {
    pending = (async () => {
      await client.$queryRaw`SELECT 1`;
    })();
    pending.catch(() => warmed.delete(client));
    warmed.set(client, pending);
  }
  await pending;
}

const RETRYABLE =
  /connection|timeout|pool|econnrefused|can't reach|server has closed|too many clients|engine is not yet connected|not yet connected|p1001|p1002|p1008|p1017/i;

export function isRetryableDbError(err: unknown): boolean {
  if (err && typeof err === "object" && "code" in err) {
    const code = String((err as { code: string }).code);
    if (/^P100[128]|^P1017/.test(code)) return true;
  }
  const msg = err instanceof Error ? err.message : String(err);
  return RETRYABLE.test(msg);
}

export async function withDbRetry<T>(
  fn: () => Promise<T>,
  options: { retries?: number; delayMs?: number; label?: string } = {}
): Promise<T> {
  const { retries = 4, delayMs = 250, label = "db" } = options;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (attempt > 0) await warmDbConnection();
      return await fn();
    } catch (err) {
      lastError = err;
      if (!isRetryableDbError(err) || attempt === retries) throw err;
      console.warn(`[${label}] retry ${attempt + 1}/${retries}`, err instanceof Error ? err.message : err);
      await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
    }
  }

  throw lastError;
}

/** Für unstable_cache-Callbacks: Wiederholung bei Verbindungsfehlern (Pooler-Kaltstart). */
export async function runCachedQuery<T>(label: string, fn: () => Promise<T>): Promise<T> {
  return withDbRetry(fn, { label, retries: 3 });
}

export async function checkDbHealth(): Promise<{ ok: boolean; detail?: string }> {
  try {
    await withDbRetry(() => prisma.$queryRaw`SELECT 1`, { retries: 2, label: "health" });
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      detail: err instanceof Error ? err.message : "Connection failed",
    };
  }
}

// In Node die erste Verbindung vorab öffnen; in Workers ist I/O außerhalb eines Requests verboten.
if (typeof window === "undefined" && !isWorkers && process.env.NEXT_PHASE !== "phase-production-build") {
  void warmDbConnection().catch(() => undefined);
}
