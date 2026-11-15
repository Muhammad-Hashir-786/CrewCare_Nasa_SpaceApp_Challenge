import type { Alert, HealthRecord } from "@/types";

/** The demo's single simulated clock, expressed in Pakistan time. */
export const APP_TIME_ZONE = "Asia/Karachi";
export const APP_TODAY_KEY = "2026-11-14";
export const APP_NOW = new Date("2026-11-14T12:00:00+05:00");
export const APP_NOW_ISO = APP_NOW.toISOString();
export const APP_DAY_START = new Date("2026-11-13T19:00:00.000Z");
export const APP_DAY_END = new Date("2026-11-14T18:59:59.999Z");

export function dayKey(value: string | Date): string {
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function clampToAppToday(value: string | number | Date): Date {
  const date = new Date(value);
  return dayKey(date) > APP_TODAY_KEY ? APP_NOW : date;
}

export function formatAppDate(value: string | number | Date, options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }): string {
  return new Intl.DateTimeFormat("en-US", { ...options, timeZone: APP_TIME_ZONE }).format(clampToAppToday(value));
}

export function formatAppDateTime(value: string | number | Date, options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }): string {
  return new Intl.DateTimeFormat("en-US", { ...options, timeZone: APP_TIME_ZONE }).format(clampToAppToday(value));
}

export function upsertDailyRecords<T extends Pick<HealthRecord, "userId" | "recordedAt"> & { id: string }>(
  records: T[],
  incoming: T,
): T[] {
  const merged = new Map<string, T>();
  for (const record of records) {
    const safe = dayKey(record.recordedAt) > APP_TODAY_KEY ? { ...record, recordedAt: APP_NOW_ISO } : record;
    merged.set(`${safe.userId}:${dayKey(safe.recordedAt)}`, safe);
  }
  const safeIncoming = dayKey(incoming.recordedAt) > APP_TODAY_KEY ? { ...incoming, recordedAt: APP_NOW_ISO } : incoming;
  merged.set(`${safeIncoming.userId}:${dayKey(safeIncoming.recordedAt)}`, safeIncoming);
  return [...merged.values()].sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
}

export function mergeDailyRecords<T extends Pick<HealthRecord, "userId" | "recordedAt"> & { id: string }>(
  base: T[],
  updates: T[],
): T[] {
  const merged = new Map<string, T>();
  for (const record of base) {
    const safe = dayKey(record.recordedAt) > APP_TODAY_KEY ? { ...record, recordedAt: APP_NOW_ISO } : record;
    merged.set(`${safe.userId}:${dayKey(safe.recordedAt)}`, safe);
  }
  for (const record of updates) {
    const safe = dayKey(record.recordedAt) > APP_TODAY_KEY ? { ...record, recordedAt: APP_NOW_ISO } : record;
    merged.set(`${safe.userId}:${dayKey(safe.recordedAt)}`, safe);
  }
  return [...merged.values()].sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
}

export function countAnomalyDays(anomalies: Array<{ timestamp: string }>, windowDays = 30): { days: number; repeatedDays: number } {
  const start = APP_NOW.getTime() - windowDays * 86_400_000;
  const counts = new Map<string, number>();
  for (const anomaly of anomalies) {
    const date = new Date(anomaly.timestamp);
    if (!Number.isFinite(date.getTime()) || date.getTime() < start || dayKey(date) > APP_TODAY_KEY) continue;
    const key = dayKey(date);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return { days: Math.min(windowDays, counts.size), repeatedDays: Math.min(windowDays, [...counts.values()].filter((count) => count > 1).length) };
}

export function mergeAlertState(base: Alert[], updates: Alert[]): Alert[] {
  const merged = new Map(base.map((alert) => [alert.id, alert]));
  for (const update of updates) {
    const canonical = merged.get(update.id);
    merged.set(update.id, canonical
      ? { ...canonical, status: update.status, acknowledgedAt: update.acknowledgedAt ?? null, acknowledgedBy: update.acknowledgedBy ?? null }
      : update);
  }
  return [...merged.values()];
}
