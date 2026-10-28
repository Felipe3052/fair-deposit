/**
 * Kostenschutz für die öffentliche Demo: jeder Live-Lauf kostet Modell-Credits.
 * In-Memory pro Server-Instanz — auf Serverless kein hartes globales Limit, aber genug gegen
 * versehentliches Dauerfeuer. Grenzen per Env: RUNS_PER_IP_PER_HOUR, RUNS_PER_DAY (0 = aus).
 */
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const perIp = new Map<string, number[]>();
let daily: number[] = [];

function limit(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

export function checkRunLimit(ip: string): { ok: true } | { ok: false; message: string } {
  const now = Date.now();
  const perHour = limit("RUNS_PER_IP_PER_HOUR", 5);
  const perDay = limit("RUNS_PER_DAY", 100);

  daily = daily.filter((t) => now - t < DAY);
  if (perDay > 0 && daily.length >= perDay) {
    return { ok: false, message: "The live demo has reached today's limit. Watch the recorded demo run instead, or try again tomorrow." };
  }
  const recent = (perIp.get(ip) ?? []).filter((t) => now - t < HOUR);
  if (perHour > 0 && recent.length >= perHour) {
    return { ok: false, message: `You have started ${recent.length} inspections in the last hour. Please wait a bit or watch the recorded demo run.` };
  }
  recent.push(now);
  perIp.set(ip, recent);
  daily.push(now);
  return { ok: true };
}
