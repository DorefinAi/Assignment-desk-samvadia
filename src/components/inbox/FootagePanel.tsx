"use client";

// The story's footage on the FTP (contract sections 1 and 3): status, folder path, files, Re-check and Pick folder.
// No thumbnails or preview yet. Only shown when the backend sends `footage`.
import React, { useEffect, useState } from "react";
import { Box, Button, CircularProgress, IconButton, Tooltip, Typography } from "@mui/material";
import { Check, Copy, FileVideo, FolderSearch, RefreshCw } from "lucide-react";
import { Footage, IntakeItem } from "@/types/desk";
import { istClock, istStamp } from "@/lib/ist";
import { MONO } from "@/components/common/shared";
import { useNow } from "@/hooks/useNow";
import { FootageTag, megabytes } from "./footageMeta";

interface FootagePanelProps {
  item: IntakeItem;
  footage: Footage;
  /** Secondary text colour of the surface it sits on */
  meta: string;
  /** Re-check and Pick folder; left out for view-only roles */
  onRecheck?: () => Promise<void>;
  onPick?: () => void;
  sx?: object;
}

function hint(item: IntakeItem, f: Footage, now: number): string | null {
  const until = f.waitUntil ? istClock(f.waitUntil) : null;
  const stillOpen = f.waitUntil ? new Date(f.waitUntil).getTime() > now : false;
  switch (f.status) {
    case "not_checked":
      return !item.reporterSlug || !item.district ? "Nothing to match on: no reporter slug or district. Pick the folder by hand if there is footage." : "Not checked yet.";
    case "waiting":
      return f.path ? null : `Looking on the FTP for a folder that matches the slug${until ? `. Gives up at ${until}` : ""}.`;
    case "not_found":
      return "No matching folder turned up in time. Re-check, or pick the folder by hand.";
    case "found":
      return stillOpen && until ? `Files can still arrive; the list updates until ${until}.` : null;
    default:
      return null;
  }
}

export default function FootagePanel({ item, footage, meta, onRecheck, onPick, sx }: FootagePanelProps) {
  const [checking, setChecking] = useState(false);
  const [copied, setCopied] = useState(false);
  const now = useNow(60000);
  const note = hint(item, footage, now);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);

  const recheck = async () => {
    if (!onRecheck) return;
    setChecking(true);
    try {
      await onRecheck();
    } finally {
      setChecking(false);
    }
  };

  const copy = () => {
    if (!footage.path) return;
    navigator.clipboard?.writeText(footage.path).then(() => setCopied(true), () => undefined);
  };

  const quietButton = { borderColor: "divider", color: "text.primary" };

  return (
    <Box component="section" aria-labelledby={`footage-${item.id}`} sx={{ borderRadius: "12px", border: "1px solid", borderColor: "divider", backgroundColor: "background.paper", color: "text.primary", px: 2, py: 1.5, ...sx }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
        <Typography id={`footage-${item.id}`} component="h3" sx={{ fontSize: "0.875rem", fontWeight: 600 }}>
          Footage
        </Typography>
        <FootageTag footage={footage} />
        <Box sx={{ flex: 1 }} />
        {onRecheck && (
          <Button size="small" variant="outlined" onClick={recheck} disabled={checking} startIcon={checking ? <CircularProgress size={13} color="inherit" /> : <RefreshCw size={14} />} sx={quietButton}>
            {checking ? "Checking" : "Re-check"}
          </Button>
        )}
        {onPick && (
          <Button size="small" variant="outlined" onClick={onPick} startIcon={<FolderSearch size={14} />} sx={quietButton}>
            Pick folder
          </Button>
        )}
      </Box>

      {footage.path && (
        <Box sx={{ mt: 1, display: "flex", alignItems: "center", gap: 0.5, minWidth: 0 }}>
          <Typography sx={{ fontFamily: MONO, fontSize: "0.8125rem", fontWeight: 600, wordBreak: "break-all", minWidth: 0 }}>{footage.path}</Typography>
          <Tooltip title={copied ? "Copied" : "Copy path"}>
            <IconButton size="small" onClick={copy} aria-label="Copy FTP path" sx={{ color: copied ? "success.main" : meta, flexShrink: 0 }}>
              {copied ? <Check size={15} /> : <Copy size={15} />}
            </IconButton>
          </Tooltip>
        </Box>
      )}

      {(note || footage.checkedAt) && (
        <Typography sx={{ mt: 0.75, fontSize: "0.75rem", color: meta }}>
          {note}
          {note && footage.checkedAt ? " " : ""}
          {footage.checkedAt && `Last checked ${istStamp(new Date(footage.checkedAt).getTime())}.`}
        </Typography>
      )}

      {footage.files.length > 0 && (
        <>
          <Box component="ul" aria-label={`${footage.files.length} footage files`} sx={{ listStyle: "none", m: 0, p: 0, mt: 1.25, borderTop: "1px solid", borderColor: "divider" }}>
            {footage.files.map((file) => (
              <Box component="li" key={file.name} sx={{ display: "grid", gridTemplateColumns: "18px minmax(0, 1fr) auto auto", alignItems: "center", columnGap: 1.25, py: 0.75, borderBottom: "1px solid", borderColor: "divider", fontSize: "0.8125rem" }}>
                <Box component="span" sx={{ display: "inline-flex", color: meta }} aria-hidden>
                  <FileVideo size={15} />
                </Box>
                <Box component="span" title={file.name} sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 500 }}>
                  {file.name}
                </Box>
                <Box component="span" sx={{ color: meta, fontVariantNumeric: "tabular-nums", textAlign: "right" }}>
                  {megabytes(file.bytes)}
                </Box>
                <Box component="time" dateTime={file.modified ?? undefined} sx={{ color: meta, fontVariantNumeric: "tabular-nums", textAlign: "right", display: { xs: "none", sm: "block" } }}>
                  {file.modified ? istStamp(new Date(file.modified).getTime()) : ""}
                </Box>
              </Box>
            ))}
          </Box>
          <Typography sx={{ mt: 0.75, fontSize: "0.75rem", color: meta, fontVariantNumeric: "tabular-nums" }}>
            {footage.files.length} {footage.files.length === 1 ? "file" : "files"}, {megabytes(footage.bytes)} in all
          </Typography>
        </>
      )}
    </Box>
  );
}
