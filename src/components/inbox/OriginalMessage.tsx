"use client";

// The incoming message as it arrived: WhatsApp items as a WhatsApp Web bubble, Outlook items as a
// Gmail-style reading pane. Editing happens in the Story editor, opened with "Edit story".
import React from "react";
import { Box, ButtonBase, CircularProgress, Typography } from "@mui/material";
import { CircleAlert, RotateCcw } from "lucide-react";
import { Attachment, IntakeItem } from "@/types/desk";
import { KIND_ICON } from "@/components/common/shared";
import { useNow } from "@/hooks/useNow";
import ChatAvatar from "./ChatAvatar";
import StoryMeta, { hasStoryMeta } from "./StoryMeta";
import { ChatColors, useChatColors } from "./chatTheme";

interface MessageProps {
  item: IntakeItem;
  onRetry?: (attachmentId: string) => void;
}

const clockTime = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
const ext = (name: string) => name.split(".").pop()?.toUpperCase();

/** A file. Only a file that is still downloading or has failed says so. */
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
        `${file.sizeMb.toFixed(1)} MB · ${ext(file.fileName)}`
      )}
    </Typography>
  );
}

function RetryButton({ c, onRetry }: { c: ChatColors; onRetry: () => void }) {
  return (
    <ButtonBase onClick={onRetry} sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, height: 28, px: 1, borderRadius: "6px", fontFamily: "inherit", fontSize: "0.75rem", fontWeight: 600, color: "text.primary", flexShrink: 0, "&:hover": { backgroundColor: c.listHover } }}>
      <RotateCcw size={13} /> Retry
    </ButtonBase>
  );
}

// --- WhatsApp -----------------------------------------------------------------------------------

export function WhatsAppMessage({ item, onRetry }: MessageProps) {
  const c = useChatColors();
  return (
    <Box
      sx={{
        position: "relative",
        alignSelf: "flex-start",
        width: "fit-content",
        maxWidth: { xs: "95%", md: "85%", lg: "75%", xl: "65%" },
        ml: 1,
        p: "6px 7px 8px 9px",
        borderRadius: "5px",
        backgroundColor: c.bubble,
        color: "text.primary",
        boxShadow: "0 1px 0.5px rgba(11, 20, 26, 0.13)",
        // The tail on the top-left corner
        "&::before": { content: '""', position: "absolute", top: 0, left: -8, width: 0, height: 0, borderTop: `6px solid ${c.bubble}`, borderRight: `6px solid ${c.bubble}`, borderBottom: "6px solid transparent", borderLeft: "6px solid transparent" },
      }}
    >
      <Typography sx={{ fontSize: "0.8125rem", fontWeight: 600, color: c.name.whatsapp, lineHeight: "20px" }} title={item.sender.contact}>
        {item.sender.name}
        <Box component="span" sx={{ fontWeight: 400, color: c.meta }}> · {item.sender.role}</Box>
      </Typography>
      <StoryMeta item={item} color={c.meta} sx={{ mt: 0.25, mb: 0.5 }} />
      {item.attachments.length > 0 && (
        <Box component="ul" aria-label={`${item.attachments.length} attachments`} sx={{ listStyle: "none", m: 0, p: 0, mt: 0.5, mb: 0.75, display: "flex", flexDirection: "column", gap: 0.5 }}>
          {item.attachments.map((file) => {
            const Icon = KIND_ICON[file.kind];
            const failed = file.state === "failed";
            return (
              <Box component="li" key={file.id} sx={{ display: "flex", alignItems: "center", gap: 1.25, p: 1, borderRadius: "5px", backgroundColor: c.bubbleInset, border: failed ? "1px solid" : "none", borderColor: "error.main" }}>
                <Box sx={{ width: 36, height: 36, borderRadius: "5px", display: "grid", placeItems: "center", flexShrink: 0, color: failed ? "error.main" : c.meta, backgroundColor: c.bubble }}>{failed ? <CircleAlert size={17} /> : <Icon size={17} />}</Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography title={file.fileName} noWrap sx={{ fontSize: "0.8125rem", fontWeight: 500 }}>
                    {file.fileName}
                  </Typography>
                  <FileStatus file={file} c={c} />
                </Box>
                {failed && onRetry && <RetryButton c={c} onRetry={() => onRetry(file.id)} />}
              </Box>
            );
          })}
        </Box>
      )}
      {/* The time sits in the bubble's last line; the filler keeps text from running under it */}
      <Typography component="div" sx={{ fontSize: "0.875rem", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
        {item.rawText}
        <Box component="span" aria-hidden sx={{ display: "inline-block", width: 52, height: 3 }} />
      </Typography>
      <Typography component="time" dateTime={item.receivedAt} sx={{ position: "absolute", right: 7, bottom: 3, fontSize: "0.6875rem", fontWeight: 500, color: c.meta }}>
        {clockTime(item.receivedAt)}
      </Typography>
    </Box>
  );
}

// --- Outlook, as a Gmail reading pane -----------------------------------------------------------

/** "Fri 16 Oct, 16:37 (4 days ago)" */
function mailDate(iso: string, now: number) {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }).replace(",", "");
  const mins = Math.max(0, Math.round((now - d.getTime()) / 60000));
  const ago = mins < 1 ? "just now" : mins < 60 ? `${mins} min ago` : mins < 1440 ? `${Math.round(mins / 60)} hours ago` : `${Math.round(mins / 1440)} days ago`;
  return `${date}, ${clockTime(iso)} (${ago})`;
}

/** Name, avatar and body line up the way Gmail lines them up: the body starts under the name. */
export const MAIL_INDENT = { xs: 0, sm: "52px" };

export function EmailMessage({ item, onRetry }: MessageProps) {
  const c = useChatColors();
  const now = useNow(60000);
  return (
    <Box component="article" sx={{ width: "100%", maxWidth: 980, color: "text.primary" }}>
      <Typography component="h2" sx={{ fontSize: "1.375rem", fontWeight: 400, lineHeight: 1.4, pl: MAIL_INDENT, mb: hasStoryMeta(item) ? 1 : 2.5 }}>
        {item.subject || "(no subject)"}
      </Typography>
      <StoryMeta item={item} color={c.mailMeta} sx={{ pl: MAIL_INDENT, mb: 2.5 }} />

      <Box sx={{ display: "flex", gap: 1.5 }}>
        <Box sx={{ display: { xs: "none", sm: "block" } }}>
          <ChatAvatar item={item} size={40} />
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Box sx={{ display: "flex", alignItems: "baseline", gap: 1, flexWrap: "wrap" }}>
            <Typography sx={{ fontSize: "0.875rem", minWidth: 0, flex: "1 1 auto" }} noWrap>
              <Box component="span" sx={{ fontWeight: 700 }}>{item.sender.name}</Box>
              <Box component="span" sx={{ fontSize: "0.75rem", color: c.mailMeta }}> &lt;{item.sender.contact}&gt;</Box>
            </Typography>
            <Typography component="time" dateTime={item.receivedAt} sx={{ fontSize: "0.75rem", color: c.mailMeta, flexShrink: 0 }}>
              {mailDate(item.receivedAt, now)}
            </Typography>
          </Box>
          <Typography sx={{ fontSize: "0.75rem", color: c.mailMeta }}>to Assignment desk</Typography>

          <Typography sx={{ fontSize: "0.875rem", lineHeight: 1.65, whiteSpace: "pre-wrap", mt: 2.5 }}>{item.rawText}</Typography>

          {item.attachments.length > 0 && (
            <Box sx={{ mt: 3, pt: 2, borderTop: "1px solid", borderColor: "divider" }}>
              <Typography sx={{ fontSize: "0.875rem", fontWeight: 600, mb: 1.5 }}>
                {item.attachments.length} {item.attachments.length === 1 ? "attachment" : "attachments"}
              </Typography>
              <Box component="ul" aria-label={`${item.attachments.length} attachments`} sx={{ listStyle: "none", m: 0, p: 0, display: "flex", flexWrap: "wrap", gap: 1.5 }}>
                {item.attachments.map((file) => {
                  const Icon = KIND_ICON[file.kind];
                  const failed = file.state === "failed";
                  return (
                    <Box component="li" key={file.id} sx={{ width: { xs: "100%", sm: 196 }, borderRadius: "8px", border: "1px solid", borderColor: failed ? "error.main" : "divider", overflow: "hidden" }}>
                      <Box sx={{ height: 84, display: "grid", placeItems: "center", backgroundColor: c.mailTile, color: failed ? "error.main" : c.mailMeta }}>{failed ? <CircleAlert size={28} /> : <Icon size={28} />}</Box>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, px: 1.25, py: 1 }}>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography title={file.fileName} noWrap sx={{ fontSize: "0.75rem", fontWeight: 600 }}>
                            {file.fileName}
                          </Typography>
                          <FileStatus file={file} c={c} />
                        </Box>
                        {failed && onRetry && <RetryButton c={c} onRetry={() => onRetry(file.id)} />}
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
