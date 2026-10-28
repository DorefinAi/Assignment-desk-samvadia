"use client";

// Footage status (contract section 1) as the desk shows it: a tag in the story, a small icon in the list.
// Found and picked by hand are "done" green, not found is a problem red, waiting stays quiet ink.
import React from "react";
import { Box } from "@mui/material";
import { Clock, FolderCheck, LucideIcon, Minus, Video, VideoOff } from "lucide-react";
import { Footage, FootageStatus } from "@/types/desk";
import { istClock } from "@/lib/ist";

export const FOOTAGE_META: Record<FootageStatus, { label: string; color: string; Icon: LucideIcon }> = {
  waiting: { label: "Waiting", color: "text.secondary", Icon: Clock },
  found: { label: "Found", color: "success.main", Icon: Video },
  manual: { label: "Picked by hand", color: "success.main", Icon: FolderCheck },
  not_found: { label: "Not found", color: "error.main", Icon: VideoOff },
  not_checked: { label: "Not checked", color: "text.secondary", Icon: Minus },
};

/** "Waiting until 14:30", or the plain label */
export function footageLabel(footage: Footage): string {
  if (footage.status === "waiting" && footage.waitUntil) return `Waiting until ${istClock(footage.waitUntil)}`;
  return FOOTAGE_META[footage.status].label;
}

export const megabytes = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

/** The status tag in the story's Footage section */
export function FootageTag({ footage }: { footage: Footage }) {
  const { color } = FOOTAGE_META[footage.status];
  return (
    <Box
      component="span"
      sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, px: 0.875, height: 22, borderRadius: "11px", border: "1px solid", borderColor: color, color, fontSize: "0.75rem", fontWeight: 600, whiteSpace: "nowrap" }}
    >
      <Box component="span" sx={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "currentColor" }} />
      {footageLabel(footage)}
    </Box>
  );
}

/** Small icon at the end of a list row. Nothing for "not checked", so rows without a slug stay as they were. */
export function FootageMark({ footage }: { footage?: Footage }) {
  if (!footage || footage.status === "not_checked") return null;
  const { color, Icon } = FOOTAGE_META[footage.status];
  const label = `Footage: ${footageLabel(footage).toLowerCase()}`;
  return (
    <Box component="span" role="img" aria-label={label} title={label} sx={{ display: "inline-flex", color, flexShrink: 0 }}>
      <Icon size={14} />
    </Box>
  );
}
