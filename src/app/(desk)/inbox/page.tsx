"use client";

import React, { useEffect, useRef, useState } from "react";
import { Box, useMediaQuery, useTheme } from "@mui/material";
import { useDesk } from "@/providers/DeskProvider";
import { EmptyState } from "@/components/common/shared";
import InboxList, { InboxTab, SourceFilter, TAB_MATCH, visibleItems } from "@/components/inbox/InboxList";
import StoryReview from "@/components/inbox/StoryReview";
import PaneDivider from "@/components/inbox/PaneDivider";

const param = (name: string) => (typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get(name));
/** ?item=<id> deep link from the overview */
const linkedItem = () => param("item");
/** ?q=<text> from the overview's reporter list */
const linkedQuery = () => param("q") ?? "";
/** ?source=whatsapp|outlook|all from the overview's stat cards */
const linkedSource = (): SourceFilter | null => {
  const s = param("source");
  return s === "whatsapp" || s === "outlook" || s === "all" ? s : null;
};

const LIST_WIDTH_KEY = "desk_intake_list_width";
const LIST_DEFAULT = 340;
const LIST_MIN = 260;
/** The open message or story keeps at least this much room */
const DETAIL_MIN = 420;

const newestFirst = <T extends { receivedAt: string }>(a: T, b: T) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime();

export default function InboxPage() {
  const { items } = useDesk();
  const theme = useTheme();
  const twoPane = useMediaQuery(theme.breakpoints.up("md"), { noSsr: true });

  const [tab, setTab] = useState<InboxTab>(() => (linkedItem() || linkedSource() ? "all" : "review"));
  const [source, setSource] = useState<SourceFilter>(() => linkedSource() ?? "all");
  const [query, setQuery] = useState(linkedQuery);
  // Nothing picked yet: the newest story that matches the link (or the newest to review). Worked out on every
  // render, so it also lands once the backend's list arrives after the first paint.
  const [pickedId, setSelectedId] = useState<string | null>(linkedItem);
  const firstMatch = () => {
    const from = linkedSource();
    const q = linkedQuery().toLowerCase();
    const first = (from ? items.filter((i) => from === "all" || i.source === from) : items.filter(TAB_MATCH.review)).filter((i) => !q || i.sender.name.toLowerCase().includes(q));
    return [...first].sort(newestFirst)[0]?.id ?? null;
  };
  const selectedId = pickedId ?? firstMatch();
  const [showDetail, setShowDetail] = useState(() => !!linkedItem());
  // "Edit story" swaps the message for the Story editor; it stays that way as the desk moves through messages
  const [editing, setEditing] = useState(false);

  // The chat list is as wide as the desk last dragged it
  const [listWidth, setListWidth] = useState(LIST_DEFAULT);
  const [room, setRoom] = useState(0);
  const panes = useRef<HTMLDivElement>(null);
  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem(LIST_WIDTH_KEY));
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restore the saved list width after hydration
      if (saved >= LIST_MIN) setListWidth(saved);
    } catch {
      // Storage blocked; keep the default width
    }
  }, []);
  useEffect(() => {
    const el = panes.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setRoom(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, [twoPane]);
  const listMax = Math.max(LIST_MIN, room - DETAIL_MIN);
  const shownWidth = Math.min(listWidth, listMax);
  const resizeList = (width: number) => {
    setListWidth(width);
    try {
      localStorage.setItem(LIST_WIDTH_KEY, String(width));
    } catch {
      // Storage blocked; the width lasts for this visit only
    }
  };

  const selected = items.find((i) => i.id === selectedId) ?? null;

  const select = (id: string) => {
    setSelectedId(id);
    setShowDetail(true);
  };

  // After a decision, open the story below it in the list (or above, if it was the last), as the message, not the editor
  const openNext = (decidedId: string) => {
    const rows = visibleItems(items, tab, source, query);
    const at = rows.findIndex((i) => i.id === decidedId);
    const next = rows[at + 1] ?? rows[at - 1];
    setEditing(false);
    if (next) setSelectedId(next.id);
  };

  const list = <InboxList items={items} tab={tab} onTab={setTab} source={source} onSource={setSource} query={query} onQuery={setQuery} selectedId={selectedId} onSelect={select} />;
  const detail = selected ? (
    <StoryReview key={selected.id} item={selected} onBack={twoPane ? undefined : () => setShowDetail(false)} editing={editing} onEditing={setEditing} onDecided={() => openNext(selected.id)} />
  ) : (
    <Box sx={{ height: "100%", display: "grid", placeItems: "center" }}>
      <EmptyState title="Pick a message" hint="Choose a WhatsApp message or email on the left to review it." />
    </Box>
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {twoPane ? (
        <Box ref={panes} sx={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: `${shownWidth}px 7px minmax(0, 1fr)` }}>
          <Box sx={{ minHeight: 0, minWidth: 0 }}>{list}</Box>
          <PaneDivider value={shownWidth} min={LIST_MIN} max={listMax} onChange={resizeList} onReset={() => resizeList(LIST_DEFAULT)} />
          <Box sx={{ minHeight: 0, minWidth: 0 }}>{detail}</Box>
        </Box>
      ) : (
        <Box sx={{ flex: 1, minHeight: 0, backgroundColor: showDetail && selected ? "background.default" : "background.paper" }}>{showDetail && selected ? detail : list}</Box>
      )}
    </Box>
  );
}
