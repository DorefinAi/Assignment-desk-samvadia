"use client";

// One viewer for every photo and video in the story. It covers the conversation pane (or the whole
// screen without a container), pages through all of the story's media with ←/→ and the strip, and
// gives focus back to the tile it was opened from when it closes (MUI Modal's focus trap does both).
import React, { useEffect, useRef, useState } from "react";
import { Box, ButtonBase, IconButton, Modal, Tooltip, Typography } from "@mui/material";
import { Check, ChevronLeft, ChevronRight, Copy, ExternalLink, X } from "lucide-react";
import { Attachment } from "@/types/desk";
import { clockTime, duration, sizeLabel } from "./threadModel";

export interface ViewerEntry {
  file: Attachment;
  senderName: string;
  receivedAt: string;
}

interface MediaViewerProps {
  entries: ViewerEntry[];
  /** Index into entries; null when closed */
  index: number | null;
  onIndex: (index: number) => void;
  onClose: () => void;
  /** Cover this element instead of the whole screen */
  container?: HTMLElement | null;
}

// The viewer is dark in both themes, like every photo viewer
const INK = "#0d0f12";
const TEXT = "#f1f3f4";
const MUTED = "#a9b0b6";
const ACCENT = "#25d366";

const barButtonSx = { color: TEXT, borderRadius: "8px", "&:hover": { backgroundColor: "rgba(255,255,255,0.1)" }, "&.Mui-focusVisible": { outline: `2px solid ${ACCENT}` } } as const;
const navSx = {
  position: "absolute",
  top: "50%",
  transform: "translateY(-50%)",
  zIndex: 1,
  width: 44,
  height: 44,
  color: TEXT,
  backgroundColor: "rgba(255,255,255,0.12)",
  "&:hover": { backgroundColor: "rgba(255,255,255,0.22)" },
  "&.Mui-disabled": { opacity: 0, pointerEvents: "none" },
  "&.Mui-focusVisible": { outline: `2px solid ${ACCENT}` },
} as const;

type CopyState = "idle" | "copied" | "failed";

export default function MediaViewer({ entries, index, onIndex, onClose, container }: MediaViewerProps) {
  const open = index !== null && entries.length > 0;
  const i = open ? Math.min(Math.max(index, 0), entries.length - 1) : 0;
  const entry = open ? entries[i] : null;
  const [copy, setCopy] = useState<{ id: string; state: CopyState }>({ id: "", state: "idle" });
  const [broken, setBroken] = useState<string | null>(null);
  const stripRef = useRef<HTMLDivElement>(null);

  // Keep the current thumbnail in view in the strip
  useEffect(() => {
    if (!open) return;
    stripRef.current?.querySelector<HTMLElement>('[aria-current="true"]')?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [open, i]);

  if (!open || !entry) return null;
  const { file } = entry;
  const video = file.kind === "video";
  const src = video ? file.previewUrl : (file.previewUrl ?? file.thumbUrl);
  const failed = broken === file.id;
  const copyState = copy.id === file.id ? copy.state : "idle";

  const go = (next: number) => {
    if (next >= 0 && next < entries.length) onIndex(next);
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    // The video's own controls use the arrow keys to seek
    if ((e.target as HTMLElement).tagName === "VIDEO") return;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(i - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      go(i + 1);
    }
  };
  const copyPath = async () => {
    if (!file.ftpPath) return;
    try {
      await navigator.clipboard.writeText(file.ftpPath);
      setCopy({ id: file.id, state: "copied" });
    } catch {
      setCopy({ id: file.id, state: "failed" });
    }
  };

  const meta = [clockTime(entry.receivedAt), file.fileName, file.sizeMb > 0 ? sizeLabel(file.sizeMb) : "", duration(file.durationSec)].filter(Boolean).join(" · ");

  return (
    <Modal
      open
      onClose={onClose}
      container={container ?? undefined}
      disableScrollLock={!!container}
      hideBackdrop
      aria-label={`${video ? "Video" : "Photo"} ${i + 1} of ${entries.length}: ${file.fileName}`}
      sx={{ position: container ? "absolute" : "fixed" }}
    >
      <Box onKeyDown={onKeyDown} sx={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", backgroundColor: INK, color: TEXT, outline: "none" }}>
        {/* Top bar: who and what, where it is in the set, and the actions */}
        <Box sx={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 1.5, minHeight: 56, px: { xs: 1, sm: 2 }, py: 0.5 }}>
          <Box sx={{ minWidth: 0, flex: 1, display: "flex", alignItems: "baseline", columnGap: 1.5, flexWrap: "wrap" }}>
            <Typography component="h2" noWrap sx={{ fontSize: "0.9375rem", fontWeight: 700, color: TEXT }}>
              {entry.senderName}
            </Typography>
            <Typography noWrap title={file.fileName} sx={{ fontSize: "0.8125rem", color: MUTED, minWidth: 0, maxWidth: "100%" }}>
              {meta}
            </Typography>
          </Box>
          <Typography aria-live="polite" sx={{ fontSize: "0.8125rem", color: MUTED, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
            {i + 1} / {entries.length}
          </Typography>
          {file.ftpPath && (
            <Tooltip title={copyState === "copied" ? "Copied" : copyState === "failed" ? "Couldn't copy. Select the path below instead." : file.ftpPath}>
              <ButtonBase onClick={copyPath} aria-label="Copy FTP path of the original" sx={{ ...barButtonSx, gap: 0.75, px: 1, height: 36, fontFamily: "inherit", fontSize: "0.8125rem" }}>
                {copyState === "copied" ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />}
                <Box component="span" sx={{ display: { xs: "none", md: "inline" } }}>
                  {copyState === "copied" ? "Copied" : "Copy FTP path"}
                </Box>
              </ButtonBase>
            </Tooltip>
          )}
          {file.previewUrl && (
            <ButtonBase component="a" href={file.previewUrl} target="_blank" rel="noopener noreferrer" aria-label="Open preview in a new tab" sx={{ ...barButtonSx, gap: 0.75, px: 1, height: 36, fontFamily: "inherit", fontSize: "0.8125rem" }}>
              <ExternalLink size={15} aria-hidden />
              <Box component="span" sx={{ display: { xs: "none", md: "inline" } }}>
                Open preview
              </Box>
            </ButtonBase>
          )}
          <IconButton onClick={onClose} aria-label="Close viewer" sx={barButtonSx}>
            <X size={20} />
          </IconButton>
        </Box>

        {/* The photo or video, scaled to fit. Only the current slide is mounted, so no other video ever loads. */}
        <Box sx={{ position: "relative", flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", px: { xs: 1, sm: 9 }, py: 1 }}>
          <IconButton onClick={() => go(i - 1)} disabled={i === 0} aria-label="Previous" sx={{ ...navSx, left: { xs: 8, sm: 24 } }}>
            <ChevronLeft size={24} />
          </IconButton>
          {failed || !src ? (
            <Box sx={{ textAlign: "center", maxWidth: 420 }}>
              {file.thumbUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={file.thumbUrl} alt={file.fileName} style={{ display: "block", maxWidth: "100%", maxHeight: "40vh", margin: "0 auto 16px", borderRadius: 4, opacity: 0.6 }} />
              )}
              <Typography sx={{ fontSize: "0.875rem", color: TEXT }}>
                {video && !file.previewUrl ? "The video preview isn't ready yet." : "The preview didn't load."}
              </Typography>
              <Typography sx={{ fontSize: "0.8125rem", color: MUTED, mt: 0.5 }}>{file.ftpPath ? "The original is on the FTP at the path below." : "The original is not on the FTP yet."}</Typography>
            </Box>
          ) : video ? (
            <video
              key={file.id}
              src={src}
              poster={file.thumbUrl ?? undefined}
              controls
              autoPlay
              playsInline
              preload="metadata"
              onError={() => setBroken(file.id)}
              aria-label={file.fileName}
              style={{ display: "block", width: "100%", height: "100%", objectFit: "contain" }}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={file.id} src={src} alt={file.fileName} decoding="async" onError={() => setBroken(file.id)} style={{ display: "block", width: "100%", height: "100%", objectFit: "contain" }} />
          )}
          <IconButton onClick={() => go(i + 1)} disabled={i === entries.length - 1} aria-label="Next" sx={{ ...navSx, right: { xs: 8, sm: 24 } }}>
            <ChevronRight size={24} />
          </IconButton>
        </Box>

        {file.ftpPath && (
          <Typography sx={{ flexShrink: 0, px: 2, pb: 1, textAlign: "center", fontSize: "0.75rem", color: MUTED, userSelect: "all", overflowWrap: "anywhere" }}>
            On FTP: {file.ftpPath}
          </Typography>
        )}

        {/* Every photo and video in the story */}
        {entries.length > 1 && (
          <Box
            ref={stripRef}
            role="group"
            aria-label="All photos and videos"
            sx={{ flexShrink: 0, display: "flex", gap: 1, height: 86, px: 2, alignItems: "center", overflowX: "auto", borderTop: "1px solid rgba(255,255,255,0.1)", "& > :first-of-type": { ml: "auto" }, "& > :last-of-type": { mr: "auto" } }}
          >
            {entries.map((e, n) => (
              <ButtonBase
                key={e.file.id}
                onClick={() => go(n)}
                aria-label={`Show ${n + 1}: ${e.file.fileName}`}
                aria-current={n === i ? "true" : undefined}
                sx={{
                  position: "relative",
                  flexShrink: 0,
                  width: 60,
                  height: 60,
                  borderRadius: "4px",
                  overflow: "hidden",
                  opacity: n === i ? 1 : 0.55,
                  outline: n === i ? `2px solid ${ACCENT}` : "none",
                  outlineOffset: 2,
                  "&:hover": { opacity: 1 },
                  "&.Mui-focusVisible": { opacity: 1, outline: `2px solid ${TEXT}` },
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={e.file.thumbUrl ?? undefined} alt="" loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                {e.file.kind === "video" && (
                  <Box aria-hidden sx={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "#fff" }}>
                    <Box sx={{ width: 0, height: 0, borderLeft: "10px solid #fff", borderTop: "6px solid transparent", borderBottom: "6px solid transparent", ml: "3px", filter: "drop-shadow(0 0 2px rgba(0,0,0,.6))" }} />
                  </Box>
                )}
              </ButtonBase>
            ))}
          </Box>
        )}
      </Box>
    </Modal>
  );
}
