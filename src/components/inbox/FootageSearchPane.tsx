"use client";

// Search one district's folders around the story's dates (GET /desk/items/{id}/footage/search). Read-only.
// With the box empty the backend lists every name in those folders, the ones closest to the slug first.
import React, { useEffect, useState } from "react";
import { Box, Button, ButtonBase, CircularProgress, MenuItem, TextField, Typography } from "@mui/material";
import { File, Folder, Search } from "lucide-react";
import { FootageHit, FootageSearch, IntakeItem } from "@/types/desk";
import { useDesk } from "@/providers/DeskProvider";
import { istStamp } from "@/lib/ist";
import { MONO } from "@/components/common/shared";
import { megabytes } from "./footageMeta";

const TYPING_PAUSE_MS = 500;
const DAY_CHOICES = [1, 3, 7];

interface FootageSearchPaneProps {
  item: IntakeItem;
  saving: boolean;
  /** Save this folder or file as the story's footage */
  onUse: (path: string) => void;
  /** Look inside a folder before choosing it */
  onOpen: (path: string) => void;
}

type Result = { key: string; found?: FootageSearch; error?: string };

export default function FootageSearchPane({ item, saving, onUse, onOpen }: FootageSearchPaneProps) {
  const { searchFootage, districts } = useDesk();
  const searchable = districts.filter((d) => d.ftpFolder);
  const own = item.district?.code ?? "";
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [days, setDays] = useState(DAY_CHOICES[0]);
  // The story's own district by default, but only one with an FTP folder (the menu lists only those). Worked out on
  // every render, since the district list may arrive after the pane opens.
  const [picked, setPicked] = useState<string | null>(null);
  const district = picked ?? (searchable.some((d) => d.code === own) ? own : "");
  // Try again: asks for the same search with fresh FTP listings. n makes a second retry a new request.
  const [retry, setRetry] = useState({ n: 0, of: "" });
  const [result, setResult] = useState<Result | null>(null);

  // Search after a pause in typing, so the newsroom FTP is not asked on every keystroke
  useEffect(() => {
    const t = setTimeout(() => setQ(text.trim()), TYPING_PAUSE_MS);
    return () => clearTimeout(t);
  }, [text]);

  const search = JSON.stringify([item.id, q, days, district]);
  const fresh = retry.of === search;
  const key = `${search}#${retry.n}`;

  useEffect(() => {
    if (!district) return;
    let live = true;
    searchFootage(item.id, { q, days, district, fresh }).then(
      (found) => live && setResult({ key, found }),
      (err: unknown) => live && setResult({ key, error: err instanceof Error ? err.message : "Could not search the FTP." })
    );
    return () => {
      live = false;
    };
  }, [searchFootage, item.id, q, days, district, fresh, key]);

  const loading = !!district && result?.key !== key;
  const hits = result?.found?.results ?? [];
  const total = result?.found?.total ?? 0;

  const tryAgain = () => setRetry((r) => ({ n: r.n + 1, of: search }));

  const note = (title: string, detail?: string, canRetry?: boolean, alert?: boolean) => (
    <Box role={alert ? "alert" : undefined} sx={{ px: 2, py: 4, textAlign: "center" }}>
      <Typography sx={{ fontSize: "0.8125rem", fontWeight: 600 }}>{title}</Typography>
      {detail && <Typography sx={{ fontSize: "0.75rem", color: "text.secondary", mt: 0.5 }}>{detail}</Typography>}
      {canRetry && (
        <Button size="small" variant="outlined" onClick={tryAgain} sx={{ mt: 1.5, borderColor: "divider", color: "text.primary" }}>
          Try again
        </Button>
      )}
    </Box>
  );

  const row = (hit: FootageHit) => {
    const Icon = hit.dir ? Folder : File;
    const details = [hit.bytes !== null ? megabytes(hit.bytes) : null, hit.modified ? istStamp(new Date(hit.modified).getTime()) : null].filter(Boolean).join(" · ");
    const label = (
      <>
        <Icon size={16} aria-hidden style={{ flexShrink: 0 }} />
        <Box component="span" sx={{ minWidth: 0, display: "block" }}>
          <Box component="span" sx={{ display: "block", fontSize: "0.8125rem", fontWeight: 500, wordBreak: "break-all" }}>{hit.name}</Box>
          <Box component="span" sx={{ display: "block", fontFamily: MONO, fontSize: "0.6875rem", color: "text.secondary", wordBreak: "break-all" }}>{hit.path}</Box>
          {details && <Box component="span" sx={{ display: "block", fontSize: "0.6875rem", color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>{details}</Box>}
        </Box>
      </>
    );
    const labelSx = { flex: 1, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "flex-start", gap: 1.25, textAlign: "left", fontFamily: "inherit", py: 0.5, borderRadius: "4px" };
    return (
      <Box component="li" key={hit.path} sx={{ display: "flex", alignItems: "center", gap: 1, px: 1.5, py: 0.5, borderBottom: "1px solid", borderColor: "divider" }}>
        {hit.dir ? (
          <ButtonBase onClick={() => onOpen(hit.path)} title="Open this folder" sx={{ ...labelSx, "&:hover": { backgroundColor: "action.hover" } }}>
            {label}
          </ButtonBase>
        ) : (
          <Box sx={labelSx}>{label}</Box>
        )}
        <Button size="small" variant="outlined" onClick={() => onUse(hit.path)} disabled={saving} aria-label={`Use ${hit.name}`} sx={{ flexShrink: 0, borderColor: "divider", color: "text.primary" }}>
          Use
        </Button>
      </Box>
    );
  };

  return (
    <Box>
      <TextField
        fullWidth
        size="small"
        autoFocus
        label="Search folder and file names"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") setQ(text.trim());
        }}
        slotProps={{ input: { startAdornment: <Search size={15} aria-hidden style={{ marginRight: 8, flexShrink: 0 }} /> }, htmlInput: { maxLength: 200 } }}
      />

      <Box sx={{ display: "flex", gap: 1, mt: 1.25, flexWrap: "wrap" }}>
        <TextField select size="small" label="District" value={district} onChange={(e) => setPicked(e.target.value)} sx={{ flex: 1, minWidth: 160 }}>
          {searchable.map((d) => (
            <MenuItem key={d.code} value={d.code}>
              {d.name}
              {d.code === own ? " (this story)" : ""}
            </MenuItem>
          ))}
        </TextField>
        <TextField select size="small" label="Dates" value={days} onChange={(e) => setDays(Number(e.target.value))} sx={{ minWidth: 150 }}>
          {DAY_CHOICES.map((n) => (
            <MenuItem key={n} value={n}>
              {n === 1 ? "1 day either side" : `${n} days either side`}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      <Box sx={{ mt: 1.25, border: "1px solid", borderColor: "divider", borderRadius: "8px", height: { xs: 260, sm: 300 }, overflowY: "auto" }} aria-busy={loading}>
        {!district ? (
          note("Choose a district to search")
        ) : loading ? (
          <Box sx={{ display: "grid", placeItems: "center", py: 6 }}>
            <CircularProgress size={22} color="inherit" aria-label="Searching" />
          </Box>
        ) : result?.error ? (
          note("Couldn't search the FTP", result.error, true, true)
        ) : hits.length === 0 ? (
          note(q ? "No name has all those words" : "Nothing in these date folders", "Try fewer words or more days, or use Browse folders.", true)
        ) : (
          <Box component="ul" aria-label="Search results" sx={{ listStyle: "none", m: 0, p: 0 }}>
            {hits.map(row)}
          </Box>
        )}
      </Box>

      <Typography role="status" sx={{ mt: 1, fontSize: "0.75rem", color: "text.secondary" }}>
        {loading || result?.error || !district ? " " : total > hits.length ? `Showing ${hits.length} of ${total}. Type more words to narrow it.` : `${total} ${total === 1 ? "match" : "matches"}.`}
      </Typography>
    </Box>
  );
}
