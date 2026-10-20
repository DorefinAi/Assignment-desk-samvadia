"use client";

// The overview counts one day (today by default): stat cards that open the page
// they count, then who sent the news and when.
import React, { useState } from "react";
import Link from "next/link";
import { Box, Button, Typography } from "@mui/material";
import { ChevronRight, FolderTree, Inbox } from "lucide-react";
import { useDesk } from "@/providers/DeskProvider";
import { useNow } from "@/hooks/useNow";
import { can, ROUTE_PERMISSION } from "@/lib/rbac";
import { dayOf } from "@/lib/slug";
import { OUTLOOK_MAILBOX, WHATSAPP_ACCOUNT } from "@/data/intakeData";
import { IntakeItem, Source } from "@/types/desk";
import { HourlyChart, isReporter, Leaderboard } from "@/components/dashboard/ReporterCharts";
import DayPicker from "@/components/dashboard/DayPicker";
import { EmptyState, listFrameSx, Panel, SOURCE_META, timeAgo } from "@/components/common/shared";

interface StatCard {
  key: string;
  label: string;
  value: number;
  note: string;
  href: string;
  icon: React.ReactNode;
}

const APPROVED = new Set(["filing", "filed", "published"]);

/** "2026-10-18" -> "18 Oct 2026" */
const longDate = (day: string) => new Date(`${day}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default function DashboardPage() {
  const { items, folders, activity, runs, role } = useDesk();
  const showConnections = can(role, "dashboard.connections");
  const showActivity = can(role, "dashboard.activity");
  const now = useNow(15000);
  const today = dayOf(new Date(now).toISOString());
  const [picked, setPicked] = useState<string | null>(null);
  const day = picked ?? today;
  const isToday = day === today;
  const dayName = isToday ? "today" : longDate(day);

  const lastRun = (source: string) => runs.find((r) => r.source === source);
  const ago = (iso?: string) => (iso ? timeAgo(iso, now) : "not yet");
  const onDay = items.filter((i) => dayOf(i.receivedAt) === day);
  const daysWithIntake = new Set(items.map((i) => dayOf(i.receivedAt)));
  const foldersOnDay = folders.filter((f) => dayOf(f.createdAt) === day);
  const downloading = onDay.reduce((n, i) => n + i.attachments.filter((a) => a.state === "downloading").length, 0);
  const opens = (href: string) => can(role, ROUTE_PERMISSION[href.split("?")[0]]);

  const fromSource = (source: Source) => onDay.filter((i) => i.source === source);
  const approvedNote = (list: IntakeItem[]) => `${list.filter((i) => APPROVED.has(i.stage)).length} approved`;
  const sourceIcon = (source: Source) => {
    const { Icon, color } = SOURCE_META[source];
    return <Icon size={14} color={color} />;
  };

  // Each card opens the page it counts
  const cards: StatCard[] = [
    { key: "all", label: `WhatsApp + Outlook ${dayName}`, value: onDay.length, note: approvedNote(onDay), href: "/inbox?source=all", icon: <Inbox size={14} /> },
    { key: "wa", label: `WhatsApp ${dayName}`, value: fromSource("whatsapp").length, note: approvedNote(fromSource("whatsapp")), href: "/inbox?source=whatsapp", icon: sourceIcon("whatsapp") },
    { key: "ol", label: `Outlook ${dayName}`, value: fromSource("outlook").length, note: approvedNote(fromSource("outlook")), href: "/inbox?source=outlook", icon: sourceIcon("outlook") },
    { key: "ftp", label: `FTP folders ${dayName}`, value: foldersOnDay.length, note: downloading ? `${downloading} ${downloading === 1 ? "file" : "files"} downloading` : "media up to date", href: "/ftp", icon: <FolderTree size={14} /> },
  ].filter((card) => opens(card.href));

  const fromReporters = onDay.filter(isReporter);

  return (
    <Box sx={{ px: { xs: 2, md: 3 }, py: 2.5, maxWidth: 1280, mx: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, flexWrap: "wrap" }}>
        <Typography component="h2" sx={{ fontSize: "0.9375rem", fontWeight: 700 }}>
          {isToday ? "Today" : longDate(day)}
          {isToday && <Box component="span" sx={{ color: "text.secondary", fontWeight: 500 }}> · {longDate(day)}</Box>}
        </Typography>
        <Box sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 1 }}>
          {!isToday && (
            <Button size="small" onClick={() => setPicked(null)} sx={{ color: "text.primary", minHeight: 32 }}>
              Back to today
            </Button>
          )}
          <DayPicker value={day} max={today} marked={daysWithIntake} onChange={(d) => setPicked(d === today ? null : d)} />
        </Box>
      </Box>

      {/* 1px gaps on the divider colour draw the cell lines at every breakpoint */}
      <Box
        component="ul"
        aria-label={`Stats for ${dayName}`}
        sx={{ ...listFrameSx, listStyle: "none", m: 0, p: 0, display: "grid", gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", lg: `repeat(${cards.length}, minmax(0, 1fr))` }, gap: "1px", backgroundColor: "divider", "& > li:last-of-type:nth-of-type(odd)": { gridColumn: { xs: "1 / -1", lg: "auto" } } }}
      >
        {cards.map((card) => {
          const link = opens(card.href);
          return (
            <Box component="li" key={card.key} sx={{ backgroundColor: "background.paper" }}>
              <Box
                {...(link ? { component: Link, href: card.href } : {})}
                sx={{ display: "flex", alignItems: "center", gap: 1, height: "100%", px: 1.75, py: 1.25, color: "text.primary", textDecoration: "none", "&:hover": link ? { backgroundColor: "action.hover" } : undefined }}
              >
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, color: "text.secondary" }}>
                    {card.icon}
                    <Typography sx={{ fontSize: "0.75rem", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{card.label}</Typography>
                  </Box>
                  <Typography sx={{ fontSize: "1.375rem", fontWeight: 700, lineHeight: 1.2, mt: 0.5, fontVariantNumeric: "tabular-nums" }}>{card.value}</Typography>
                  <Typography sx={{ fontSize: "0.6875rem", color: "text.secondary" }}>{card.note}</Typography>
                </Box>
                {link && <ChevronRight size={16} aria-hidden style={{ opacity: 0.5, flexShrink: 0 }} />}
              </Box>
            </Box>
          );
        })}
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) minmax(0, 1fr)" }, gap: 2, alignItems: "stretch", "& > *": { minWidth: 0 } }}>
        <HourlyChart items={fromReporters} now={now} isToday={isToday} />
        <Leaderboard items={fromReporters} now={now} />
      </Box>

      {(showActivity || showConnections) && (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: showActivity && showConnections ? "minmax(0, 1.35fr) minmax(0, 1fr)" : "1fr" }, gap: 2, alignItems: "start" }}>
          {showActivity && (
            <Panel title="Activity">
              <Box sx={{ maxHeight: 360, overflowY: "auto" }}>
                {activity.length === 0 && <EmptyState title="No activity yet" hint="Approvals, folders and feed changes are logged here." />}
                {activity.map((a, i) => (
                  <Box key={a.id} sx={{ display: "flex", gap: 1.25, px: 2, py: 1, borderTop: i ? "1px solid" : "none", borderColor: "divider" }}>
                    <Typography sx={{ fontSize: "0.75rem", flex: 1, minWidth: 0, lineHeight: 1.5, color: a.tone === "error" ? "error.main" : "text.primary" }}>{a.text}</Typography>
                    <Typography sx={{ fontSize: "0.6875rem", color: "text.secondary", flexShrink: 0 }}>{timeAgo(a.at, now)}</Typography>
                  </Box>
                ))}
              </Box>
            </Panel>
          )}

          {showConnections && (
            <Panel title="Connections" hint="Demo values until the real accounts are connected.">
              {[
                { name: "WhatsApp Business", detail: WHATSAPP_ACCOUNT, at: lastRun("whatsapp")?.at },
                { name: "Outlook mailbox", detail: OUTLOOK_MAILBOX, at: lastRun("outlook")?.at },
                { name: "Newsroom FTP", detail: "Folders and media", at: folders[0]?.updatedAt ?? folders[0]?.createdAt },
                { name: "Octopus (RSS)", detail: "Reads the RSS feed", at: lastRun("octopus")?.at },
              ].map((c, i) => (
                <Box key={c.name} sx={{ display: "flex", alignItems: "center", gap: 1.25, px: 2, py: 1.25, borderTop: i ? "1px solid" : "none", borderColor: "divider" }}>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography sx={{ fontSize: "0.8125rem", fontWeight: 600 }}>{c.name}</Typography>
                    <Typography sx={{ fontSize: "0.6875rem", color: "text.secondary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.detail}</Typography>
                  </Box>
                  <Typography sx={{ fontSize: "0.6875rem", color: "text.secondary", flexShrink: 0 }}>{ago(c.at)}</Typography>
                </Box>
              ))}
            </Panel>
          )}
        </Box>
      )}
    </Box>
  );
}
