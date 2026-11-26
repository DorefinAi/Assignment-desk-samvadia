"use client";

// Media inside a chat bubble, WhatsApp style. Photos and videos form an album: 1 tile alone (landscape,
// never a tall portrait), 2 side by side, 3 as two plus one wide, 4 or more as a 2x2 with "+N". Every box
// has a fixed shape, so nothing moves while the thumbnails load. Everything else is a compact file row.
import React from "react";
import { Box, ButtonBase, CircularProgress, Typography } from "@mui/material";
import { CircleAlert, Play, RotateCcw } from "lucide-react";
import { Attachment } from "@/types/desk";
import { KIND_ICON } from "@/components/common/shared";
import { ChatColors, useChatColors } from "./chatTheme";
import { duration, fileExt, sizeLabel } from "./threadModel";

/** One album column; two columns and the gap make the album 343px wide */
const TILE = 170;
const GAP = 3;
export const ALBUM_WIDTH = TILE * 2 + GAP;
/** A lone tile is at most ALBUM_WIDTH x this */
const SINGLE_MAX_H = 300;

/** Only a file that is still downloading or has failed says so */
function FileStatus({ file, c }: { file: Attachment; c: ChatColors }) {
  const failed = file.state === "failed";
  return (
    <Typography component="span" sx={{ fontSize: "0.6875rem", color: failed ? "error.main" : c.meta, display: "flex", alignItems: "center", gap: 0.5, fontVariantNumeric: "tabular-nums" }}>
      {file.state === "downloading" ? (
        <>
          <CircularProgress size={10} thickness={6} color="inherit" variant="determinate" value={file.progress} /> Downloading {file.progress}%
        </>
      ) : failed ? (
        "Failed to download"
      ) : (
        [sizeLabel(file.sizeMb), fileExt(file.fileName), duration(file.durationSec)].filter(Boolean).join(" · ")
      )}
    </Typography>
  );
}

function FileRow({ file, c, onRetry }: { file: Attachment; c: ChatColors; onRetry?: (id: string) => void }) {
  const Icon = KIND_ICON[file.kind];
  const failed = file.state === "failed";
  const pdf = fileExt(file.fileName) === "PDF";
  return (
    <Box component="li" sx={{ display: "flex", alignItems: "center", gap: 1.25, width: ALBUM_WIDTH, maxWidth: "100%", p: 1, borderRadius: "6px", backgroundColor: c.bubbleInset, outline: failed ? "1px solid" : "none", outlineColor: "error.main", outlineOffset: "-1px" }}>
      {pdf && !failed ? (
        <Box aria-hidden sx={{ width: 32, height: 38, borderRadius: "3px", display: "grid", placeItems: "center", flexShrink: 0, backgroundColor: "#c5221f", color: "#fff", fontSize: "0.625rem", fontWeight: 700 }}>
          PDF
        </Box>
      ) : (
        <Box aria-hidden sx={{ width: 36, height: 36, borderRadius: "5px", display: "grid", placeItems: "center", flexShrink: 0, color: failed ? "error.main" : c.meta, backgroundColor: c.bubble }}>
          {failed ? <CircleAlert size={17} /> : <Icon size={17} />}
        </Box>
      )}
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography title={file.fileName} noWrap sx={{ fontSize: "0.8125rem", fontWeight: 500, lineHeight: 1.4 }}>
          {file.fileName}
        </Typography>
        <FileStatus file={file} c={c} />
      </Box>
      {failed && onRetry && (
        <ButtonBase
          onClick={() => onRetry(file.id)}
          aria-label={`Retry download of ${file.fileName}`}
          sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, height: 32, px: 1, borderRadius: "6px", fontFamily: "inherit", fontSize: "0.75rem", fontWeight: 600, color: "text.primary", flexShrink: 0, "&:hover": { backgroundColor: c.listHover }, "&.Mui-focusVisible": { outline: "2px solid", outlineColor: "primary.main" } }}
        >
          <RotateCcw size={13} aria-hidden /> Retry
        </ButtonBase>
      )}
    </Box>
  );
}

/** Documents, audio, and media that is still downloading, failed or has no still */
export function FileRows({ files, onRetry }: { files: Attachment[]; onRetry?: (id: string) => void }) {
  const c = useChatColors();
  if (files.length === 0) return null;
  return (
    <Box component="ul" aria-label={files.length === 1 ? "1 file" : `${files.length} files`} sx={{ listStyle: "none", m: 0, p: 0, display: "flex", flexDirection: "column", gap: 0.5 }}>
      {files.map((file) => (
        <FileRow key={file.id} file={file} c={c} onRetry={onRetry} />
      ))}
    </Box>
  );
}

/** The box shape of tile i in an album of `count` shown tiles */
function tileAspect(count: number, index: number, file: Attachment): string {
  if (count === 1) {
    // Landscape keeps its shape up to 16:9; anything taller is cropped to ALBUM_WIDTH x SINGLE_MAX_H
    const ratio = file.width && file.height ? file.width / file.height : 4 / 3;
    return String(Math.min(16 / 9, Math.max(ALBUM_WIDTH / SINGLE_MAX_H, ratio)));
  }
  if (count === 3 && index === 2) return `${ALBUM_WIDTH} / 190`;
  return "1 / 1";
}

interface TileProps {
  file: Attachment;
  aspect: string;
  wide: boolean;
  /** "+N" over the last tile when there are more than four */
  more: number;
  onOpen: () => void;
}

function Tile({ file, aspect, wide, more, onOpen }: TileProps) {
  const video = file.kind === "video";
  const length = duration(file.durationSec);
  const label = more > 0 ? `Open ${file.fileName} and ${more} more` : video ? `Play video ${file.fileName}${length ? `, ${length}` : ""}` : `Open photo ${file.fileName}`;
  return (
    <ButtonBase
      onClick={onOpen}
      aria-label={label}
      sx={{
        position: "relative",
        display: "block",
        gridColumn: wide ? "1 / -1" : undefined,
        aspectRatio: aspect,
        overflow: "hidden",
        borderRadius: "5px",
        backgroundColor: "rgba(127, 127, 127, 0.18)",
        "&.Mui-focusVisible": { outline: "3px solid", outlineColor: "primary.main", outlineOffset: "-3px", zIndex: 1 },
        "&:hover img": { filter: "brightness(0.92)" },
      }}
    >
      {/* Plain <img>: the API's media links are cookie-authenticated, which the next/image optimiser can't forward */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={file.thumbUrl ?? undefined} alt="" loading="lazy" decoding="async" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      {video && more === 0 && (
        <>
          <Box aria-hidden sx={{ position: "absolute", inset: 0, m: "auto", width: 44, height: 44, borderRadius: "50%", display: "grid", placeItems: "center", backgroundColor: "rgba(0, 0, 0, 0.55)", color: "#fff" }}>
            <Play size={19} fill="currentColor" style={{ marginLeft: 3 }} />
          </Box>
          {length && (
            <Box aria-hidden component="span" sx={{ position: "absolute", left: 6, bottom: 6, px: 0.625, borderRadius: "4px", backgroundColor: "rgba(0, 0, 0, 0.6)", color: "#fff", fontSize: "0.6875rem", lineHeight: "17px", fontVariantNumeric: "tabular-nums" }}>
              {length}
            </Box>
          )}
        </>
      )}
      {more > 0 && (
        <Box aria-hidden sx={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", backgroundColor: "rgba(0, 0, 0, 0.5)", color: "#fff", fontSize: "1.625rem", fontWeight: 500 }}>
          +{more}
        </Box>
      )}
    </ButtonBase>
  );
}

interface AlbumProps {
  tiles: Attachment[];
  /** Opens the viewer on this tile; the tile gets focus back when the viewer closes */
  onOpen: (file: Attachment) => void;
  /** Drawn over the album's bottom-right corner (the time, when there is no caption) */
  overlay?: React.ReactNode;
}

export const Album = React.memo(function Album({ tiles, onOpen, overlay }: AlbumProps) {
  const shown = tiles.slice(0, 4);
  const more = tiles.length - shown.length;
  const photos = tiles.filter((t) => t.kind === "image").length;
  const videos = tiles.length - photos;
  const name = [photos && `${photos} ${photos === 1 ? "photo" : "photos"}`, videos && `${videos} ${videos === 1 ? "video" : "videos"}`].filter(Boolean).join(" and ");
  return (
    <Box role="group" aria-label={name} sx={{ position: "relative", display: "grid", gridTemplateColumns: shown.length === 1 ? "1fr" : `repeat(2, minmax(0, ${TILE}px))`, gap: `${GAP}px`, width: ALBUM_WIDTH, maxWidth: "100%" }}>
      {shown.map((file, i) => (
        <Tile key={file.id} file={file} aspect={tileAspect(shown.length, i, file)} wide={shown.length === 3 && i === 2} more={i === 3 ? more : 0} onOpen={() => onOpen(file)} />
      ))}
      {overlay}
    </Box>
  );
});
