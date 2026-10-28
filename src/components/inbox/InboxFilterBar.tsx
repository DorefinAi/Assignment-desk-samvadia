"use client";

// The list filters under the source pills: what kind of item, when it arrived (IST), and which district.
// The kind and district pills only appear when the backend supports them (kind_counts, GET /desk/districts).
// Default is every time, so the list never looks empty just because the day changed.
import React, { useState } from "react";
import { Box, Button, ListItemIcon, Menu, MenuItem, Popover, TextField, Typography } from "@mui/material";
import { Check, ChevronDown, Clock, MapPin } from "lucide-react";
import { ITEM_KINDS, ItemKind, RangePreset } from "@/types/desk";
import { useDesk } from "@/providers/DeskProvider";
import { fromIstLocal, RANGE_LABEL, rangeLabel, toIstLocal } from "@/lib/ist";
import { KIND_LABEL } from "./StoryMeta";
import { pillSx, useChatColors } from "./chatTheme";

const PRESETS: RangePreset[] = ["any", "1h", "today", "24h"];
type Open = "kind" | "range" | "custom" | "district" | null;

const menuPaper = { paper: { sx: { mt: 0.5, minWidth: 200 } } };
const tick = (on: boolean) => <ListItemIcon sx={{ minWidth: "26px !important" }}>{on ? <Check size={15} /> : null}</ListItemIcon>;

export default function InboxFilterBar() {
  const { filters, setFilters, kindCounts, districts } = useDesk();
  const c = useChatColors();
  const [open, setOpen] = useState<Open>(null);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [draftFrom, setDraftFrom] = useState("");
  const [draftTo, setDraftTo] = useState("");

  const show = (which: Open) => (e: React.MouseEvent<HTMLElement>) => {
    setAnchor(e.currentTarget);
    setOpen(which);
  };
  const close = () => setOpen(null);

  const pickKind = (kind: ItemKind) => {
    setFilters({ kind });
    close();
  };
  const pickRange = (range: RangePreset) => {
    setFilters({ range });
    close();
  };
  const openCustom = () => {
    // Start from what is set, else the last 24 hours, in IST
    const now = Date.now();
    setDraftFrom(filters.customFrom || toIstLocal(now - 86400000));
    setDraftTo(filters.customTo || toIstLocal(now));
    setOpen("custom");
  };
  const fromMs = fromIstLocal(draftFrom);
  const toMs = fromIstLocal(draftTo);
  const customError = !Number.isNaN(fromMs) && !Number.isNaN(toMs) && fromMs >= toMs ? "The end must be after the start." : null;
  const applyCustom = () => {
    setFilters({ range: "custom", customFrom: Number.isNaN(fromMs) ? "" : draftFrom, customTo: Number.isNaN(toMs) ? "" : draftTo });
    close();
  };

  const district = districts.find((d) => d.code === filters.district);
  const caret = <ChevronDown size={13} aria-hidden />;

  return (
    <Box role="group" aria-label="List filters" sx={{ display: "flex", gap: 0.75, overflowX: "auto", scrollbarWidth: "none" }}>
      {kindCounts && (
        <Box component="button" onClick={show("kind")} aria-haspopup="menu" aria-expanded={open === "kind"} aria-label={`Showing ${KIND_LABEL[filters.kind]}, change`} sx={pillSx(c, filters.kind !== "story")}>
          {KIND_LABEL[filters.kind]}
          <Box component="span" sx={{ fontWeight: 500, opacity: 0.8, fontVariantNumeric: "tabular-nums" }}>{kindCounts[filters.kind]}</Box>
          {caret}
        </Box>
      )}
      <Box component="button" onClick={show("range")} aria-haspopup="menu" aria-expanded={open === "range" || open === "custom"} aria-label={`Received: ${rangeLabel(filters)}, change`} sx={pillSx(c, filters.range !== "any")}>
        <Clock size={13} aria-hidden />
        {rangeLabel(filters)}
        {caret}
      </Box>
      {districts.length > 0 && (
        <Box component="button" onClick={show("district")} aria-haspopup="menu" aria-expanded={open === "district"} aria-label={`District: ${district?.name ?? "all"}, change`} sx={pillSx(c, !!district)}>
          <MapPin size={13} aria-hidden />
          {district?.name ?? "All districts"}
          {caret}
        </Box>
      )}

      <Menu anchorEl={anchor} open={open === "kind"} onClose={close} slotProps={menuPaper}>
        {ITEM_KINDS.map((k) => (
          <MenuItem key={k} selected={k === filters.kind} onClick={() => pickKind(k)} sx={{ fontSize: "0.875rem" }}>
            {tick(k === filters.kind)}
            <Box component="span" sx={{ flex: 1 }}>{KIND_LABEL[k]}</Box>
            <Box component="span" sx={{ ml: 2, color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>{kindCounts?.[k] ?? 0}</Box>
          </MenuItem>
        ))}
      </Menu>

      <Menu anchorEl={anchor} open={open === "range"} onClose={close} slotProps={menuPaper}>
        {PRESETS.map((r) => (
          <MenuItem key={r} selected={r === filters.range} onClick={() => pickRange(r)} sx={{ fontSize: "0.875rem" }}>
            {tick(r === filters.range)}
            {RANGE_LABEL[r]}
          </MenuItem>
        ))}
        <MenuItem selected={filters.range === "custom"} onClick={openCustom} sx={{ fontSize: "0.875rem" }}>
          {tick(filters.range === "custom")}
          Custom range…
        </MenuItem>
      </Menu>

      <Popover
        open={open === "custom"}
        anchorEl={anchor}
        onClose={close}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        slotProps={{ paper: { role: "dialog", "aria-label": "Custom time range", sx: { mt: 0.5, p: 2, width: 300, maxWidth: "calc(100vw - 32px)" } } }}
      >
        <Typography sx={{ fontSize: "0.875rem", fontWeight: 600 }}>Received between</Typography>
        <Typography sx={{ fontSize: "0.75rem", color: "text.secondary", mb: 1.5 }}>India time (IST). Leave one end empty to keep it open.</Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          <TextField type="datetime-local" size="small" label="From" value={draftFrom} onChange={(e) => setDraftFrom(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          <TextField type="datetime-local" size="small" label="To" value={draftTo} onChange={(e) => setDraftTo(e.target.value)} error={!!customError} helperText={customError ?? " "} slotProps={{ inputLabel: { shrink: true } }} />
        </Box>
        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
          <Button onClick={close} sx={{ color: "text.primary" }}>
            Cancel
          </Button>
          <Button variant="contained" onClick={applyCustom} disabled={!!customError || (Number.isNaN(fromMs) && Number.isNaN(toMs))}>
            Apply
          </Button>
        </Box>
      </Popover>

      <Menu anchorEl={anchor} open={open === "district"} onClose={close} slotProps={{ paper: { sx: { mt: 0.5, minWidth: 220, maxHeight: 360 } } }}>
        <MenuItem selected={!filters.district} onClick={() => (setFilters({ district: null }), close())} sx={{ fontSize: "0.875rem" }}>
          {tick(!filters.district)}
          All districts
        </MenuItem>
        {districts.map((d) => (
          <MenuItem key={d.code} selected={d.code === filters.district} onClick={() => (setFilters({ district: d.code }), close())} sx={{ fontSize: "0.875rem" }}>
            {tick(d.code === filters.district)}
            <Box component="span" sx={{ flex: 1 }}>{d.name}</Box>
            <Box component="span" sx={{ ml: 2, color: "text.secondary" }}>{d.code}</Box>
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
}
