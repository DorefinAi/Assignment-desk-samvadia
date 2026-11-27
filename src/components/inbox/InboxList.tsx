"use client";

// The chat list: one row per incoming message, newest first. Its filters live in InboxToolbar: in the
// bar above on a computer, passed in as `header` on a phone.
import React from "react";
import { Box, Button, Typography } from "@mui/material";
import { IntakeItem, needsDecision, Source } from "@/types/desk";
import { useNow } from "@/hooks/useNow";
import { EmptyState, timeAgo } from "@/components/common/shared";
import { useDesk } from "@/providers/DeskProvider";
import { DEFAULT_FILTERS } from "@/types/desk";
import ChatAvatar from "./ChatAvatar";
import { FootageMark } from "./footageMeta";
import { useChatColors } from "./chatTheme";

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

interface InboxListProps {
  items: IntakeItem[];
  tab: InboxTab;
  source: SourceFilter;
  query: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** The filters, stacked on top of the list (phones) */
  header?: React.ReactNode;
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

export default function InboxList({ items, tab, source, query, selectedId, onSelect, header }: InboxListProps) {
  const c = useChatColors();
  const now = useNow(30000);
  const { filters, setFilters } = useDesk();
  const filtered = filters.range !== "any" || !!filters.district;

  const q = query.trim().toLowerCase();
  const visible = visibleItems(items, tab, source, query);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: 0, height: "100%", backgroundColor: c.list }}>
      {header}

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
          const waiting = needsDecision(item);
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
                  {/* More than one message in the story (a WhatsApp burst or an email thread) */}
                  {(item.messages?.length ?? 0) > 1 && (
                    <Box component="span" title={`${item.messages!.length} messages`} sx={{ minWidth: 20, height: 20, px: 0.625, borderRadius: "10px", display: "inline-grid", placeItems: "center", flexShrink: 0, backgroundColor: c.bar, color: c.meta, fontSize: "0.6875rem", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                      {item.messages!.length}
                      <Box component="span" sx={{ position: "absolute", width: "1px", height: "1px", overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" }}> messages</Box>
                    </Box>
                  )}
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
