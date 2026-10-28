// India time (IST, UTC+05:30, no daylight saving) for the inbox's time filter, whatever the browser's zone.
import { InboxFilters, RangePreset } from "@/types/desk";

const OFFSET_MS = 330 * 60000;
const pad = (n: number) => String(n).padStart(2, "0");

/** IST wall clock for a moment: "2026-10-27T09:30" (what a datetime-local input shows) */
export function toIstLocal(ms: number): string {
  const d = new Date(ms + OFFSET_MS);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

/** "2026-10-27T09:30" read as IST, as epoch ms; NaN when it isn't a date and time */
export function fromIstLocal(value: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!m) return NaN;
  return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) - OFFSET_MS;
}

/** ISO with the IST offset, as the API takes it: "2026-10-27T09:30:00+05:30" */
export function toIstIso(ms: number): string {
  const d = new Date(ms + OFFSET_MS);
  return `${toIstLocal(ms)}:${pad(d.getUTCSeconds())}+05:30`;
}

/** Midnight IST at the start of the IST day that holds `ms` */
export function istDayStart(ms: number): number {
  const local = toIstLocal(ms);
  return fromIstLocal(`${local.slice(0, 10)}T00:00`);
}

/** The [from, to) window a filter means right now, as epoch ms. Either end may be open. */
export function rangeWindow(filters: Pick<InboxFilters, "range" | "customFrom" | "customTo">, now = Date.now()): { from: number | null; to: number | null } {
  switch (filters.range) {
    case "1h":
      return { from: now - 3600000, to: null };
    case "24h":
      return { from: now - 86400000, to: null };
    case "today":
      return { from: istDayStart(now), to: null };
    case "custom": {
      const from = fromIstLocal(filters.customFrom);
      const to = fromIstLocal(filters.customTo);
      return { from: Number.isNaN(from) ? null : from, to: Number.isNaN(to) ? null : to };
    }
    default:
      return { from: null, to: null };
  }
}

export const RANGE_LABEL: Record<RangePreset, string> = { any: "Any time", "1h": "Last hour", today: "Today", "24h": "Last 24 hours", custom: "Custom range" };

/** "27 Oct, 09:30" in IST */
export function istStamp(ms: number): string {
  return new Date(ms).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });
}

/** "14:30" in IST */
export function istClock(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false });
}

/** What the time filter pill says */
export function rangeLabel(filters: Pick<InboxFilters, "range" | "customFrom" | "customTo">): string {
  if (filters.range !== "custom") return RANGE_LABEL[filters.range];
  const { from, to } = rangeWindow(filters);
  if (from !== null && to !== null) return `${istStamp(from)} to ${istStamp(to)}`;
  if (from !== null) return `From ${istStamp(from)}`;
  if (to !== null) return `Until ${istStamp(to)}`;
  return RANGE_LABEL.any;
}

/** Client-side copy of the list filters, for demo data and for a backend that ignores the new query parameters.
 *  A filter on a field the item doesn't carry (an older backend) lets the item through. */
export function matchesFilters(item: { receivedAt: string; kind?: string; district?: { code: string } | null }, filters: InboxFilters, now = Date.now()): boolean {
  const { from, to } = rangeWindow(filters, now);
  const at = new Date(item.receivedAt).getTime();
  if (from !== null && at < from) return false;
  if (to !== null && at >= to) return false;
  if (item.kind && item.kind !== filters.kind) return false;
  if (filters.district && item.district !== undefined && item.district?.code !== filters.district) return false;
  return true;
}
