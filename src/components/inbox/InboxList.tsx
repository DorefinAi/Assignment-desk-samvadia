"use client";

// The chat list: one row per incoming message, newest first.
import React, { useState } from "react";
import { Box, Button, IconButton, InputAdornment, InputBase, Tooltip, Typography } from "@mui/material";
import { ArrowLeft, Search } from "lucide-react";
import { IntakeItem, Source } from "@/types/desk";
import { useNow } from "@/hooks/useNow";
import { EmptyState, SOURCE_META, timeAgo } from "@/components/common/shared";
import { useDesk } from "@/providers/DeskProvider";
import { DEFAULT_FILTERS } from "@/types/desk";
import ChatAvatar from "./ChatAvatar";
import InboxFilterBar from "./InboxFilterBar";
import { FootageMark } from "./footageMeta";
import { pillSx as chatPillSx, useChatColors } from "./chatTheme";

export type InboxTab = "review" | "approved" | "rejected" | "all";
export type SourceFilter = Source | "all";

export const TAB_MATCH: Record<InboxTab, (item: IntakeItem) => boolean> = {
  review: (i) => i.stage === "new",
  approved: (i) => i.stage === "filing" || i.stage === "filed" || i.stage === "published",
  rejected: (i) => i.stage === "rejected",
  all: () => true,
};

/** The rows the list shows, in its order (newest first). The page uses it to pick the next story. */
export function visibleItems(items: IntakeItem[], tab: InboxTab, source: SourceFilter, query: string) {
  const q = query.trim().toLowerCase();
  return items
    .filter(TAB_MATCH[tab])
    .filter((i) => source === "all" || i.source === source)
    .filter((i) => !q || [i.draft.headline, i.rawText, i.sender.name, i.chat ?? "", i.subject ?? "", i.draft.slug].some((t) => t.toLowerCase().includes(q)))
    .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
}

const SOURCE_LABEL: Record<SourceFilter, string> = { all: "All sources", whatsapp: SOURCE_META.whatsapp.label, outlook: SOURCE_META.outlook.label, portal: SOURCE_META.portal.label };

const TABS: { key: InboxTab; label: string }[] = [
  { key: "review", label: "To review" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "all", label: "All" },
];

interface InboxListProps {
  items: IntakeItem[];
  tab: InboxTab;
  onTab: (tab: InboxTab) => void;
  source: SourceFilter;
  onSource: (source: SourceFilter) => void;
  query: string;
  onQuery: (query: string) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/** "Received" time the way a chat list shows it: clock time today, "x min ago" in the first hour. */
function stamp(iso: string, now: number) {
  const mins = (now - new Date(iso).getTime()) / 60000;
  if (mins < 60) return timeAgo(iso, now);
  const d = new Date(iso);
  return d.toDateString() === new Date(now).toDateString()
    ? d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false })
    : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export default function InboxList({ items, tab, onTab, source, onSource, query, onQuery, selectedId, onSelect }: InboxListProps) {
  const c = useChatColors();
  const now = useNow(30000);
  const { filters, setFilters } = useDesk();
  const filtered = filters.range !== "any" || !!filters.district;
  const [searchOpen, setSearchOpen] = useState(false);
  // A search with text in it stays open
  const searching = searchOpen || query !== "";
  const closeSearch = () => {
    onQuery("");
    setSearchOpen(false);
  };

  const q = query.trim().toLowerCase();
  const visible = visibleItems(items, tab, source, query);

  const pillSx = (active: boolean) => chatPillSx(c, active);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: 0, height: "100%", backgroundColor: c.list }}>
      <Box sx={{ px: 1.5, pt: 1.5, pb: 1, display: "flex", flexDirection: "column", gap: 1 }}>
        {/* Sources and the search button share one row; search opens in their place */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, minHeight: 36 }}>
          {searching ? (
            <InputBase
              autoFocus
              placeholder="Search sender, text or slug"
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && closeSearch()}
              inputProps={{ "aria-label": "Search intake" }}
              startAdornment={
                <InputAdornment position="start">
                  <IconButton size="small" onClick={closeSearch} aria-label="Close search" sx={{ color: c.pillText }}>
                    <ArrowLeft size={16} />
                  </IconButton>
                </InputAdornment>
              }
              sx={{ flex: 1, height: 36, pl: 0.5, pr: 1.5, borderRadius: "10px", backgroundColor: c.bar, fontSize: "0.8125rem" }}
            />
          ) : (
            <>
              <Box sx={{ display: "flex", gap: 0.75, flex: 1, minWidth: 0, overflowX: "auto", scrollbarWidth: "none" }} role="group" aria-label="Filter by source">
                {(["all", "whatsapp", "outlook"] as SourceFilter[]).map((s) => {
                  const active = s === source;
                  const meta = s === "all" ? null : SOURCE_META[s];
                  return (
                    <Box key={s} component="button" aria-pressed={active} onClick={() => onSource(s)} sx={pillSx(active)}>
                      {meta && <meta.Icon size={13} color={active ? "currentColor" : meta.color} />}
                      {SOURCE_LABEL[s]}
                    </Box>
                  );
                })}
              </Box>
              <Tooltip title="Search">
                <IconButton onClick={() => setSearchOpen(true)} aria-label="Search intake" sx={{ width: 36, height: 36, color: c.meta, "&:hover": { backgroundColor: c.bar } }}>
                  <Search size={17} />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Box>

        <InboxFilterBar />

        <Box role="tablist" aria-label="Review status" sx={{ display: "flex", gap: 0.5, overflowX: "auto", scrollbarWidth: "none" }}>
          {TABS.map((t) => {
            const count = items.filter(TAB_MATCH[t.key]).length;
            const active = t.key === tab;
            return (
              <Box key={t.key} component="button" role="tab" aria-selected={active} onClick={() => onTab(t.key)} sx={pillSx(active)}>
                {t.label}
                <Box component="span" sx={{ fontWeight: 500, opacity: 0.8, fontVariantNumeric: "tabular-nums" }}>{count}</Box>
              </Box>
            );
          })}
        </Box>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        {visible.length === 0 && (
          <EmptyState
            title={q ? "Nothing matches that search" : filtered ? "Nothing in this time or district" : tab === "review" ? "All caught up" : "Nothing here yet"}
            hint={q ? "Try the sender's name or a word from the message." : filtered ? "Widen the filter to see more." : tab === "review" ? "New WhatsApp messages and emails show up here." : "Stories move here once they are reviewed."}
            action={
              !q && filtered ? (
                <Button variant="outlined" onClick={() => setFilters({ range: DEFAULT_FILTERS.range, district: null })} sx={{ borderColor: "divider", color: "text.primary" }}>
                  Show any time, all districts
                </Button>
              ) : undefined
            }
          />
        )}
        {visible.map((item) => {
          const active = item.id === selectedId;
          const waiting = item.stage === "new";
          return (
            <Box
              key={item.id}
              component="button"
              onClick={() => onSelect(item.id)}
              aria-current={active ? "true" : undefined}
              // Row sizes follow whatsapp-web-ui: 72px rows, 50px avatars, a full-width line between rows
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.25,
                width: "100%",
                minHeight: 72,
                textAlign: "left",
                px: 2,
                py: 1.25,
                border: 0,
                borderBottom: "1px solid",
                borderColor: c.line,
                backgroundColor: active ? c.listSelected : "transparent",
                fontFamily: "inherit",
                color: "text.primary",
                cursor: "pointer",
                "&:hover": { backgroundColor: active ? c.listSelected : c.listHover },
              }}
            >
              <ChatAvatar item={item} size={50} />
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.25 }}>
                  <Typography sx={{ fontSize: "1rem", fontWeight: waiting ? 600 : 500, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {item.sender.name}
                  </Typography>
                  <Typography sx={{ fontSize: "0.7rem", color: waiting ? c.unread : c.meta, fontWeight: waiting ? 600 : 400, flexShrink: 0 }}>{stamp(item.receivedAt, now)}</Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography sx={{ fontSize: "0.85rem", color: c.meta, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {item.draft.headline}
                  </Typography>
                  <FootageMark footage={item.footage} />
                  {waiting && <Box component="span" aria-label="Waiting for review" sx={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: c.unread, flexShrink: 0 }} />}
                </Box>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
