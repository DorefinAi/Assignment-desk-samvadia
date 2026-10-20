"use client";

// Stories sent by reporters and stringers on one day: when they came in, and who
// sent them. Press releases and agencies are left out; they are not reporters.
import React from "react";
import Link from "next/link";
import { Box, Tooltip, Typography } from "@mui/material";
import { ChevronRight } from "lucide-react";
import { IntakeItem, Source } from "@/types/desk";
import { EmptyState, Panel, SOURCE_META, timeAgo } from "@/components/common/shared";

// The overview charts WhatsApp and Outlook; reports filed in the reporter app are not counted here yet
type ChartSource = Exclude<Source, "portal">;
const SOURCES: ChartSource[] = ["whatsapp", "outlook"];
const APPROVED = new Set(["filing", "filed", "published"]);

export const isReporter = (item: IntakeItem) => item.sender.role === "Reporter" || item.sender.role === "Stringer";

/** "1st India Reporters · Jodhpur" -> "Jodhpur" */
const cityOf = (item: IntakeItem) => item.chat?.split("·").pop()?.trim();

const hourLabel = (h: number) => `${String(h).padStart(2, "0")}:00`;

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

const Legend = () => (
  <Box sx={{ display: "flex", gap: 1.5 }}>
    {SOURCES.map((s) => (
      <Box key={s} sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, fontSize: "0.6875rem", color: "text.secondary" }}>
        <Box component="span" sx={{ width: 8, height: 8, borderRadius: "2px", backgroundColor: SOURCE_META[s].color }} />
        {SOURCE_META[s].label}
      </Box>
    ))}
  </Box>
);

/** The hours worth drawing: the stretch that had news (and the current hour today), at least 8 wide. */
function hourWindow(hours: number[], currentHour: number | null): [number, number] {
  const marks = currentHour === null ? hours : [...hours, currentHour];
  let from = Math.max(0, Math.min(...marks) - 1);
  let to = Math.min(23, Math.max(...marks) + 1);
  while (to - from < 7) {
    if (from > 0) from -= 1;
    if (to - from < 7 && to < 23) to += 1;
  }
  return [from, to];
}

export function HourlyChart({ items, now, isToday }: { items: IntakeItem[]; now: number; isToday: boolean }) {
  if (items.length === 0) {
    return (
      <Panel title="When the news came in">
        <EmptyState title="No reporter stories on this day" hint="Pick another date at the top." />
      </Panel>
    );
  }

  const byHour = new Map<number, Record<ChartSource, number>>();
  for (const item of items) {
    if (item.source === "portal") continue;
    const h = new Date(item.receivedAt).getHours();
    const slot = byHour.get(h) ?? { whatsapp: 0, outlook: 0 };
    slot[item.source] += 1;
    byHour.set(h, slot);
  }
  const currentHour = isToday ? new Date(now).getHours() : null;
  const [from, to] = hourWindow([...byHour.keys()], currentHour);
  const columns = Array.from({ length: to - from + 1 }, (_, i) => {
    const h = from + i;
    const slot = byHour.get(h) ?? { whatsapp: 0, outlook: 0 };
    return { h, ...slot, total: slot.whatsapp + slot.outlook };
  });
  const most = Math.max(...columns.map((c) => c.total));
  const busiest = columns.find((c) => c.total === most)!;
  return (
    <Panel
      title="When the news came in"
      hint={`${plural(items.length, "story", "stories")} from reporters · busiest at ${hourLabel(busiest.h)}`}
      action={<Legend />}
      sx={{ height: "100%" }}
    >
      {/* Fills the panel, so it matches the reporter list beside it */}
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", px: 2, pt: 2.5, pb: 1.5, minHeight: 200 }}>
        <Box component="ol" aria-label="Reporter stories per hour" sx={{ flex: 1, listStyle: "none", m: 0, p: 0, display: "grid", gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))`, columnGap: 0.75 }}>
          {columns.map((c) => {
            const isNow = c.h === currentHour;
            const label = `${hourLabel(c.h)}: ${plural(c.total, "story", "stories")} (WhatsApp ${c.whatsapp}, Outlook ${c.outlook})`;
            return (
              <Tooltip key={c.h} title={c.total ? label : ""} placement="top" arrow disableInteractive>
                <Box component="li" aria-label={label} sx={{ display: "flex", flexDirection: "column", alignItems: "stretch", minWidth: 0, minHeight: 0 }}>
                  {/* Plot: the whole slot is the hover target, columns grow up from the baseline */}
                  <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", borderBottom: "1px solid", borderColor: "divider", backgroundColor: isNow ? "action.hover" : "transparent", borderRadius: "6px 6px 0 0" }}>
                    {c.total > 0 && (
                      <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, fontVariantNumeric: "tabular-nums", mb: 0.5 }}>{c.total}</Typography>
                    )}
                    <Box sx={{ width: "100%", maxWidth: 32, height: `${(c.total / most) * 82}%`, display: "flex", flexDirection: "column-reverse", gap: c.whatsapp && c.outlook ? "2px" : 0 }}>
                      {SOURCES.map((s) =>
                        c[s] ? <Box key={s} sx={{ flex: c[s], backgroundColor: SOURCE_META[s].color, borderRadius: s === "outlook" || !c.outlook ? "4px 4px 0 0" : 0 }} /> : null
                      )}
                    </Box>
                  </Box>
                  <Typography sx={{ mt: 0.75, fontSize: "0.6875rem", textAlign: "center", fontVariantNumeric: "tabular-nums", color: isNow ? "text.primary" : "text.secondary", fontWeight: isNow ? 700 : 400, whiteSpace: "nowrap", overflow: "hidden" }}>
                    {isNow ? "Now" : String(c.h).padStart(2, "0")}
                  </Typography>
                </Box>
              </Tooltip>
            );
          })}
        </Box>
      </Box>
    </Panel>
  );
}

interface Row {
  name: string;
  city?: string;
  whatsapp: number;
  outlook: number;
  approved: number;
  lastAt: string;
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

export function Leaderboard({ items, now, limit = 6 }: { items: IntakeItem[]; now: number; limit?: number }) {
  const byName = new Map<string, Row>();
  for (const item of items) {
    if (item.source === "portal") continue;
    const row = byName.get(item.sender.name) ?? { name: item.sender.name, city: cityOf(item), whatsapp: 0, outlook: 0, approved: 0, lastAt: item.receivedAt };
    row[item.source] += 1;
    if (APPROVED.has(item.stage)) row.approved += 1;
    if (item.receivedAt > row.lastAt) row.lastAt = item.receivedAt;
    byName.set(item.sender.name, row);
  }
  const total = (r: Row) => r.whatsapp + r.outlook;
  // Most stories first; on a tie, whoever filed most recently
  const all = [...byName.values()].sort((a, b) => total(b) - total(a) || b.approved - a.approved || b.lastAt.localeCompare(a.lastAt));
  const rows = all.slice(0, limit);
  const most = Math.max(1, ...rows.map(total));

  return (
    <Panel title="Reporters" hint={all.length ? `${plural(all.length, "reporter")} sent news · most stories first` : undefined} action={<Legend />}>
      {rows.length === 0 ? (
        <EmptyState title="No reporter stories on this day" hint="Pick another date at the top." />
      ) : (
        <Box component="ol" sx={{ listStyle: "none", m: 0, p: 0 }}>
          {rows.map((r, i) => (
            <Box component="li" key={r.name} sx={{ borderTop: i ? "1px solid" : "none", borderColor: "divider" }}>
              {/* Opens Intake searched to this reporter */}
              <Box
                component={Link}
                href={`/inbox?source=all&q=${encodeURIComponent(r.name)}`}
                sx={{ display: "grid", gridTemplateColumns: "16px 32px minmax(0, 1fr) 72px 28px 16px", alignItems: "center", columnGap: 1.25, px: 2, py: 1.1, color: "text.primary", textDecoration: "none", "&:hover": { backgroundColor: "action.hover" }, "&:hover .go": { opacity: 1 } }}
              >
                <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: "text.secondary", fontVariantNumeric: "tabular-nums", textAlign: "right" }}>{i + 1}</Typography>
                <Box aria-hidden sx={{ width: 32, height: 32, borderRadius: "50%", display: "grid", placeItems: "center", fontSize: "0.6875rem", fontWeight: 700, backgroundColor: "action.selected" }}>
                  {initials(r.name)}
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontSize: "0.8125rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</Typography>
                  <Typography sx={{ fontSize: "0.6875rem", color: "text.secondary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {[r.city, `last ${timeAgo(r.lastAt, now)}`, r.approved ? `${r.approved} approved` : null].filter(Boolean).join(" · ")}
                  </Typography>
                </Box>
                {/* Share of the top reporter's count, split by source, on a track */}
                <Tooltip title={`WhatsApp ${r.whatsapp} · Outlook ${r.outlook}`} placement="top" arrow disableInteractive>
                  <Box sx={{ height: 6, borderRadius: "3px", backgroundColor: "action.hover", overflow: "hidden" }}>
                    <Box sx={{ display: "flex", gap: "2px", height: "100%", width: `${(total(r) / most) * 100}%` }}>
                      {SOURCES.map((s) => (r[s] ? <Box key={s} sx={{ flex: r[s], backgroundColor: SOURCE_META[s].color }} /> : null))}
                    </Box>
                  </Box>
                </Tooltip>
                <Typography sx={{ fontSize: "0.9375rem", fontWeight: 700, fontVariantNumeric: "tabular-nums", textAlign: "right" }}>{total(r)}</Typography>
                <Box className="go" sx={{ display: "flex", color: "text.secondary", opacity: 0.4, transition: "opacity 0.15s" }}>
                  <ChevronRight size={16} aria-hidden />
                </Box>
              </Box>
            </Box>
          ))}
          {all.length > rows.length && (
            <Typography sx={{ px: 2, py: 1, borderTop: "1px solid", borderColor: "divider", fontSize: "0.6875rem", color: "text.secondary" }}>
              and {plural(all.length - rows.length, "more reporter")}
            </Typography>
          )}
        </Box>
      )}
    </Panel>
  );
}
