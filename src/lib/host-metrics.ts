import os from "node:os";

/**
 * Kennzahlen des Hosts (RAM, CPU, Prozess). In Cloudflare Workers gibt es keinen eigenen Server –
 * die Node-Polyfills liefern dort 0 oder werfen; dann kommen Nullwerte zurück (`available: false`).
 */
export function hostMetrics() {
  try {
    const totalMem = os.totalmem();
    if (!totalMem) throw new Error("no host metrics");
    const [load1 = 0] = os.loadavg();
    const cpuCount = os.cpus().length || 1;
    return {
      available: true,
      totalMem,
      freeMem: os.freemem(),
      cpuCount,
      load1,
      processRss: process.memoryUsage().rss,
      uptimeSeconds: Math.round(process.uptime()),
      platform: os.platform(),
    };
  } catch {
    return { available: false, totalMem: 0, freeMem: 0, cpuCount: 0, load1: 0, processRss: 0, uptimeSeconds: 0, platform: "workers" };
  }
}
