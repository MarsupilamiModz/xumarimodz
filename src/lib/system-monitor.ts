import "server-only";
import os from "os";
import { prisma } from "@/lib/db";
import { getSiteSetting, setSiteSetting } from "@/lib/site-settings";

export type ServiceKey = "database" | "auth" | "storage" | "payments" | "email";
export const SERVICE_KEYS: ServiceKey[] = ["database", "auth", "storage", "payments", "email"];

export type ServiceCheck = {
  key: ServiceKey;
  state: "up" | "down" | "unconfigured";
  latencyMs: number | null;
  detail?: string;
};

type DayBucket = Partial<Record<ServiceKey, { ok: number; total: number; latencySum: number }>>;
type MonitorState = {
  lastRunAt: string | null;
  days: Record<string, DayBucket>;
  incidents: { service: ServiceKey; startedAt: string; endedAt: string | null; detail?: string }[];
};

const KEY = "system_monitor";
const EMPTY: MonitorState = { lastRunAt: null, days: {}, incidents: [] };
/** Seitenaufrufe zeichnen höchstens alle 5 Minuten auf, damit die Historie gleichmäßig bleibt. */
const RECORD_INTERVAL_MS = 5 * 60 * 1000;

async function timed<T>(fn: () => Promise<T>): Promise<{ ms: number; value?: T; error?: string }> {
  const start = performance.now();
  try {
    const value = await Promise.race([
      fn(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Timeout after 5s")), 5000)),
    ]);
    return { ms: Math.round(performance.now() - start), value };
  } catch (err) {
    return { ms: Math.round(performance.now() - start), error: err instanceof Error ? err.message : "Check failed" };
  }
}

/** Echte Prüfungen gegen die Dienste (Datenbank-Abfrage, Auth-Health, Stripe-API, R2-Konfiguration, E-Mail). */
export async function runServiceChecks(): Promise<ServiceCheck[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const [db, auth, payments] = await Promise.all([
    timed(() => prisma.$queryRaw`SELECT 1`),
    supabaseUrl
      ? timed(async () => {
          const res = await fetch(`${supabaseUrl}/auth/v1/health`, {
            headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "" },
            cache: "no-store",
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
        })
      : Promise.resolve(null),
    (async () => {
      const { getStripeConfigStatus } = await import("@/lib/stripe-config");
      if (!getStripeConfigStatus().configured) return null;
      const { getStripe } = await import("@/lib/stripe");
      return timed(() => getStripe().balance.retrieve());
    })(),
  ]);

  const { getR2ConfigStatus } = await import("@/lib/r2-config");
  const r2 = getR2ConfigStatus();
  let emailConfigured = Boolean(process.env.RESEND_API_KEY);
  try {
    const { getEmailSettingsPublic } = await import("@/lib/email/settings");
    emailConfigured = emailConfigured || (await getEmailSettingsPublic()).configured;
  } catch {
    /* Einstellungen nicht lesbar – bleibt beim Env-Wert */
  }

  const toCheck = (key: ServiceKey, r: { ms: number; error?: string } | null): ServiceCheck =>
    r === null
      ? { key, state: "unconfigured", latencyMs: null }
      : { key, state: r.error ? "down" : "up", latencyMs: r.ms, detail: r.error };

  return [
    toCheck("database", db),
    toCheck("auth", auth),
    { key: "storage", state: r2.configured ? "up" : "unconfigured", latencyMs: null, detail: r2.configured ? undefined : r2.missing.join(", ") },
    toCheck("payments", payments),
    { key: "email", state: emailConfigured ? "up" : "unconfigured", latencyMs: null },
  ];
}

export async function getMonitorState(): Promise<MonitorState> {
  const state = await getSiteSetting<MonitorState>(KEY, EMPTY);
  return { lastRunAt: state.lastRunAt ?? null, days: state.days ?? {}, incidents: Array.isArray(state.incidents) ? state.incidents : [] };
}

/** Speichert Tageswerte (30 Tage) und öffnet/schließt Vorfälle je Dienst. `force` umgeht das 5-Minuten-Intervall (Cron). */
export async function recordServiceChecks(checks: ServiceCheck[], force = false) {
  const state = await getMonitorState();
  const now = new Date();
  if (!force && state.lastRunAt && now.getTime() - new Date(state.lastRunAt).getTime() < RECORD_INTERVAL_MS) return state;

  const day = now.toISOString().slice(0, 10);
  const bucket: DayBucket = { ...(state.days[day] ?? {}) };
  for (const c of checks) {
    if (c.state === "unconfigured") continue;
    const prev = bucket[c.key] ?? { ok: 0, total: 0, latencySum: 0 };
    bucket[c.key] = {
      ok: prev.ok + (c.state === "up" ? 1 : 0),
      total: prev.total + 1,
      latencySum: prev.latencySum + (c.latencyMs ?? 0),
    };
  }

  const cutoff = new Date(now.getTime() - 30 * 86_400_000).toISOString().slice(0, 10);
  const days = Object.fromEntries(Object.entries({ ...state.days, [day]: bucket }).filter(([d]) => d > cutoff));

  const incidents = [...state.incidents];
  for (const c of checks) {
    const open = incidents.find((i) => i.service === c.key && !i.endedAt);
    if (c.state === "down" && !open) incidents.unshift({ service: c.key, startedAt: now.toISOString(), endedAt: null, detail: c.detail?.slice(0, 200) });
    if (c.state === "up" && open) open.endedAt = now.toISOString();
  }

  const next: MonitorState = { lastRunAt: now.toISOString(), days, incidents: incidents.slice(0, 50) };
  await setSiteSetting(KEY, next);
  return next;
}

export function serverMetrics() {
  const [load1] = os.loadavg();
  const cpus = os.cpus().length || 1;
  const total = os.totalmem();
  const free = os.freemem();
  return {
    cpuLoadPct: Math.min(100, Math.round((load1 / cpus) * 100)),
    memoryUsedPct: Math.round(((total - free) / total) * 100),
    processMemoryMb: Math.round(process.memoryUsage().rss / (1024 * 1024)),
    uptimeSeconds: Math.round(process.uptime()),
    platformNote: os.platform() === "win32" ? "loadavg-unavailable" : null,
  };
}
