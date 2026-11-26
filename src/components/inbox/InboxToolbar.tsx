"use client";

// The intake filters. On a computer they sit in one row in the grey bar under the main nav: sources,
// the list filters, the review tabs, and a search field on the right. Under 1200px the list filters fold
// into one "Filters" button so the row never wraps. On a phone they stack at the top of the list.
// The state lives in the inbox page and DeskProvider; this only places it.
import React, { useState } from "react";
import { Box, IconButton, InputAdornment, InputBase, Popover, Tooltip, useMediaQuery, useTheme } from "@mui/material";
import { ArrowLeft, Search, SlidersHorizontal, X } from "lucide-react";
import { IntakeItem } from "@/types/desk";
import { SOURCE_META } from "@/components/common/shared";
import { useDesk } from "@/providers/DeskProvider";
import InboxFilterBar from "./InboxFilterBar";
import { InboxTab, SourceFilter, TAB_MATCH } from "./InboxList";
import { pillSx, useChatColors } from "./chatTheme";

export interface InboxToolbarProps {
  items: IntakeItem[];
  tab: InboxTab;
  onTab: (tab: InboxTab) => void;
  source: SourceFilter;
  onSource: (source: SourceFilter) => void;
  query: string;
  onQuery: (query: string) => void;
}

const SOURCES: SourceFilter[] = ["all", "whatsapp", "outlook"];
const TABS: { key: InboxTab; label: string }[] = [
  { key: "review", label: "To review" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "all", label: "All" },
];

function SourcePills({ source, onSource, short }: { source: SourceFilter; onSource: (s: SourceFilter) => void; short?: boolean }) {
  const c = useChatColors();
  return (
    <Box role="group" aria-label="Filter by source" sx={{ display: "flex", gap: 0.75, flexShrink: 0 }}>
      {SOURCES.map((s) => {
        const active = s === source;
        const meta = s === "all" ? null : SOURCE_META[s];
        return (
          <Box key={s} component="button" aria-pressed={active} onClick={() => onSource(s)} sx={pillSx(c, active)}>
            {meta && <meta.Icon size={13} color={active ? "currentColor" : meta.color} />}
            {meta ? meta.label : short ? "All" : "All sources"}
          </Box>
        );
      })}
    </Box>
  );
}

function StatusTabs({ items, tab, onTab }: Pick<InboxToolbarProps, "items" | "tab" | "onTab">) {
  const c = useChatColors();
  return (
    <Box role="tablist" aria-label="Review status" sx={{ display: "flex", gap: 0.5, flexShrink: 0 }}>
      {TABS.map((t) => {
        const count = items.filter(TAB_MATCH[t.key]).length;
        const active = t.key === tab;
        return (
          <Box key={t.key} component="button" role="tab" aria-selected={active} onClick={() => onTab(t.key)} sx={pillSx(c, active)}>
            {t.label}
            <Box component="span" sx={{ fontWeight: 500, opacity: 0.8, fontVariantNumeric: "tabular-nums" }}>
              {count}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

const Divider = () => <Box aria-hidden sx={{ width: "1px", height: 24, flexShrink: 0, mx: 0.75, backgroundColor: "divider" }} />;

/** The list filters behind one button, for a bar too narrow to show them */
function FiltersButton() {
  const c = useChatColors();
  const { filters } = useDesk();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const active = (filters.kind !== "story" ? 1 : 0) + (filters.range !== "any" ? 1 : 0) + (filters.district ? 1 : 0);
  return (
    <>
      <Box component="button" onClick={(e: React.MouseEvent<HTMLElement>) => setAnchor(e.currentTarget)} aria-haspopup="dialog" aria-expanded={!!anchor} sx={pillSx(c, active > 0)}>
        <SlidersHorizontal size={13} aria-hidden />
        Filters
        {active > 0 && (
          <Box component="span" sx={{ fontWeight: 500, opacity: 0.8, fontVariantNumeric: "tabular-nums" }}>
            {active}
          </Box>
        )}
      </Box>
      <Popover
        open={!!anchor}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        slotProps={{ paper: { role: "dialog", "aria-label": "List filters", sx: { mt: 0.75, p: 1.5, borderRadius: "12px" } } }}
      >
        <InboxFilterBar stacked />
      </Popover>
    </>
  );
}

function SearchField({ query, onQuery }: Pick<InboxToolbarProps, "query" | "onQuery">) {
  const c = useChatColors();
  return (
    <InputBase
      type="search"
      placeholder="Search name, slug, text…"
      value={query}
      onChange={(e) => onQuery(e.target.value)}
      onKeyDown={(e) => e.key === "Escape" && onQuery("")}
      inputProps={{ "aria-label": "Search intake" }}
      startAdornment={
        <InputAdornment position="start" sx={{ color: c.meta, mr: 0.75 }}>
          <Search size={15} aria-hidden />
        </InputAdornment>
      }
      endAdornment={
        query ? (
          <InputAdornment position="end">
            <IconButton size="small" onClick={() => onQuery("")} aria-label="Clear search" sx={{ color: c.meta, mr: -0.5 }}>
              <X size={14} />
            </IconButton>
          </InputAdornment>
        ) : null
      }
      sx={{
        ml: "auto",
        flex: "1 1 240px",
        minWidth: 130,
        maxWidth: 300,
        height: 34,
        pl: 1.5,
        pr: 1,
        borderRadius: "17px",
        border: "1px solid",
        borderColor: "divider",
        backgroundColor: "background.paper",
        fontSize: "0.8125rem",
        "&.Mui-focused": { borderColor: "text.primary" },
        // The browser's own clear button doubles ours
        "& input::-webkit-search-cancel-button": { display: "none" },
      }}
    />
  );
}

/** Computers: one row under the main nav, in place of the page's description line */
export function InboxTopBar({ items, tab, onTab, source, onSource, query, onQuery }: InboxToolbarProps) {
  const theme = useTheme();
  const roomy = useMediaQuery(theme.breakpoints.up("lg"), { noSsr: true });
  return (
    <Box
      role="toolbar"
      aria-label="Intake filters"
      sx={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 0.75, height: 52, px: 2, overflow: "hidden", borderBottom: "1px solid", borderColor: "divider", backgroundColor: "background.default" }}
    >
      <SourcePills source={source} onSource={onSource} short={!roomy} />
      <Divider />
      {roomy ? <InboxFilterBar /> : <FiltersButton />}
      <Divider />
      <StatusTabs items={items} tab={tab} onTab={onTab} />
      <SearchField query={query} onQuery={onQuery} />
    </Box>
  );
}

/** Phones: the same controls stacked at the top of the list; search opens in place of the sources */
export function InboxStackedFilters({ items, tab, onTab, source, onSource, query, onQuery }: InboxToolbarProps) {
  const c = useChatColors();
  const [searchOpen, setSearchOpen] = useState(false);
  // A search with text in it stays open
  const searching = searchOpen || query !== "";
  const closeSearch = () => {
    onQuery("");
    setSearchOpen(false);
  };
  return (
    <Box sx={{ px: 1.5, pt: 1.5, pb: 1, display: "flex", flexDirection: "column", gap: 1 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, minHeight: 36 }}>
        {searching ? (
          <InputBase
            autoFocus
            placeholder="Search name, slug, text…"
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
            <Box sx={{ flex: 1, minWidth: 0, overflowX: "auto", scrollbarWidth: "none" }}>
              <SourcePills source={source} onSource={onSource} />
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
      <Box sx={{ overflowX: "auto", scrollbarWidth: "none" }}>
        <StatusTabs items={items} tab={tab} onTab={onTab} />
      </Box>
    </Box>
  );
}
