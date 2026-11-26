"use client";

// The story as one clean chat, for WhatsApp and email alike. Messages from one sender in a row form a
// group: the name once on top, bubbles 3px apart, the tail on the first. Photos and videos sent back to
// back become one album with the captions under it. Date dividers and the desk's own actions sit between
// the groups at the time they happened. Every photo and video opens in one shared viewer.
import React, { useCallback, useMemo, useState } from "react";
import { Box, ButtonBase, Typography } from "@mui/material";
import { Mail } from "lucide-react";
import { Attachment, DeskEvent, IntakeItem } from "@/types/desk";
import { Album, FileRows } from "./MediaGrid";
import MediaViewer, { ViewerEntry } from "./MediaViewer";
import { ChatColors, useChatColors } from "./chatTheme";
import { AlbumBlock, buildThread, clockTime, MessageGroup, TextBlock } from "./threadModel";

/** Bubble width on the chat wall */
export const BUBBLE_MAX = { xs: "92%", md: "80%", lg: "70%", xl: "62%" };
/** Chat text: Devanagari needs more line height than Latin to keep its matras clear */
const TEXT = { fontSize: "0.90625rem", lineHeight: 1.6, display: "flow-root" } as const;
const shadow = "0 1px 0.5px rgba(11, 20, 26, 0.13)";

const EVENT_LABEL: Record<DeskEvent["kind"], string> = { sent_back: "Desk sent it back", rejected: "Rejected", held: "Put on hold", note: "Desk note" };

const DeskEventLine = React.memo(function DeskEventLine({ event, c }: { event: DeskEvent; c: ChatColors }) {
  return (
    <Typography component="p" sx={{ alignSelf: "center", maxWidth: 560, m: 0, px: 1.25, py: 0.5, borderRadius: "7px", backgroundColor: c.notice, color: c.noticeText, fontSize: "0.75rem", lineHeight: 1.6, textAlign: "center", boxShadow: shadow }}>
      {EVENT_LABEL[event.kind]}
      {event.text ? `: “${event.text}”` : ""}
      <Box component="span" sx={{ opacity: 0.8 }}>
        {" "}
        · {[event.by, clockTime(event.at)].filter(Boolean).join(", ")}
      </Box>
    </Typography>
  );
});

/** WhatsApp's time stamp: floats to the end of the last line, or drops under it when the line is full */
function Stamp({ at, c }: { at: string; c: ChatColors }) {
  return (
    <Typography component="time" dateTime={at} sx={{ float: "right", position: "relative", top: 7, ml: 1.5, mb: "-2px", fontSize: "0.6875rem", lineHeight: "15px", color: c.meta, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
      {clockTime(at)}
    </Typography>
  );
}

const bubbleSx = (c: ChatColors, first: boolean) => ({
  position: "relative",
  width: "fit-content",
  maxWidth: "100%",
  borderRadius: "8px",
  backgroundColor: c.bubble,
  color: "text.primary",
  boxShadow: shadow,
  // The tail, on the first bubble of a group only
  ...(first && {
    borderTopLeftRadius: 0,
    "&::before": { content: '""', position: "absolute", top: 0, left: -8, width: 0, height: 0, borderTop: `7px solid ${c.bubble}`, borderRight: `7px solid ${c.bubble}`, borderBottom: "7px solid transparent", borderLeft: "7px solid transparent" },
  }),
});

function TextBubble({ block, first, onRetry, c }: { block: TextBlock; first: boolean; onRetry?: (id: string) => void; c: ChatColors }) {
  const [full, setFull] = useState(false);
  const { message, files, subjectChange } = block;
  const quoted = message.text.trim() !== "" && message.text.trim() !== message.bodyText.trim();
  const text = (full ? message.text : message.bodyText).trim();
  const stampInText = text !== "" && !quoted && files.length === 0;
  return (
    <Box sx={{ ...bubbleSx(c, first), px: 1.125, pt: 0.75, pb: 0.75 }}>
      {subjectChange && (
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.75, width: "fit-content", maxWidth: "100%", mb: 0.5, px: 0.875, py: 0.25, borderRadius: "5px", backgroundColor: c.bubbleInset, color: c.meta, fontSize: "0.75rem", lineHeight: "18px" }}>
          <Mail size={12} aria-hidden style={{ flexShrink: 0, marginTop: 3 }} />
          <Box component="span" sx={{ color: "text.primary" }}>
            <Box component="span" sx={{ position: "absolute", width: "1px", height: "1px", overflow: "hidden", clip: "rect(0 0 0 0)" }}>New subject: </Box>
            {subjectChange}
          </Box>
        </Box>
      )}
      {text !== "" && (
        <Typography component="div" sx={{ ...TEXT, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
          {text}
          {stampInText && <Stamp at={message.receivedAt} c={c} />}
        </Typography>
      )}
      {quoted && (
        <ButtonBase
          onClick={() => setFull((v) => !v)}
          aria-expanded={full}
          sx={{ display: "block", mt: 0.25, py: 0.25, borderRadius: "4px", fontFamily: "inherit", fontSize: "0.78125rem", fontWeight: 500, color: c.name.outlook, textAlign: "left", "&:hover": { textDecoration: "underline" }, "&.Mui-focusVisible": { outline: "2px solid", outlineColor: "primary.main" } }}
        >
          {full ? "Hide quoted email" : "··· Show quoted email"}
        </ButtonBase>
      )}
      {files.length > 0 && (
        <Box sx={{ mt: text ? 0.75 : 0 }}>
          <FileRows files={files} onRetry={onRetry} />
        </Box>
      )}
      {!stampInText && (
        <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 0.25, minWidth: 40 }}>
          <Typography component="time" dateTime={message.receivedAt} sx={{ fontSize: "0.6875rem", lineHeight: "15px", color: c.meta, fontVariantNumeric: "tabular-nums" }}>
            {clockTime(message.receivedAt)}
          </Typography>
        </Box>
      )}
    </Box>
  );
}

function AlbumBubble({ block, first, onOpen, onRetry, c }: { block: AlbumBlock; first: boolean; onOpen: (file: Attachment) => void; onRetry?: (id: string) => void; c: ChatColors }) {
  // No caption: the time sits on the photo, the way WhatsApp shows it
  const overlay = !block.caption && (
    <Typography component="time" dateTime={block.at} sx={{ position: "absolute", right: 6, bottom: 6, px: 0.75, borderRadius: "8px", backgroundColor: "rgba(0, 0, 0, 0.45)", color: "#fff", fontSize: "0.6875rem", lineHeight: "18px", fontVariantNumeric: "tabular-nums", pointerEvents: "none" }}>
      {clockTime(block.at)}
    </Typography>
  );
  return (
    <Box sx={{ ...bubbleSx(c, first), p: "3px" }}>
      {block.files.length > 0 && (
        <Box sx={{ mb: "3px" }}>
          <FileRows files={block.files} onRetry={onRetry} />
        </Box>
      )}
      <Album tiles={block.tiles} onOpen={onOpen} overlay={overlay} />
      {block.caption && (
        <Typography component="div" sx={{ ...TEXT, maxWidth: 343, px: 0.75, pt: 0.5, pb: 0.25, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
          {block.caption}
          <Stamp at={block.at} c={c} />
        </Typography>
      )}
    </Box>
  );
}

// Memoized: paging the viewer changes only ThreadView's `open`, and every prop here is stable across that
// (group from the thread memo, onOpen a callback, c a constant), so the rows of a long thread are not redrawn
const Group = React.memo(function Group({ group, name, onOpen, onRetry, c }: { group: MessageGroup; name: string; onOpen: (file: Attachment) => void; onRetry?: (id: string) => void; c: ChatColors }) {
  return (
    <Box component="article" aria-label={group.reply ? `${name}, reply` : name} sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "3px", maxWidth: BUBBLE_MAX, ml: 1 }}>
      <Typography component="h3" title={group.senderContact || undefined} sx={{ ml: 0.5, mb: "1px", fontSize: "0.78125rem", fontWeight: 600, lineHeight: 1.4, color: c.name[group.source] }}>
        {name}
        {group.reply && (
          <Box component="span" sx={{ ml: 0.75, fontWeight: 500, fontSize: "0.6875rem", color: c.meta }}>
            reply
          </Box>
        )}
      </Typography>
      {group.blocks.map((block, i) =>
        block.type === "text" ? <TextBubble key={block.key} block={block} first={i === 0} onRetry={onRetry} c={c} /> : <AlbumBubble key={block.key} block={block} first={i === 0} onOpen={onOpen} onRetry={onRetry} c={c} />
      )}
    </Box>
  );
});

interface ThreadViewProps {
  item: IntakeItem;
  onRetry?: (attachmentId: string) => void;
  /** The viewer covers this element; the whole screen without it */
  viewerContainer?: HTMLElement | null;
}

export default function ThreadView({ item, onRetry, viewerContainer }: ThreadViewProps) {
  const c = useChatColors();
  // Rebuilt only when the item's messages, media or desk events change, not on every render of the pane
  const { id, source, subject, rawText, receivedAt, messages, attachments, deskEvents } = item;
  const senderContact = item.sender.contact;
  const thread = useMemo(
    () => buildThread({ id, source, subject, rawText, receivedAt, messages, attachments, deskEvents, senderContact }),
    [id, source, subject, rawText, receivedAt, messages, attachments, deskEvents, senderContact]
  );
  const [open, setOpen] = useState<number | null>(null);

  // Someone else in the chat shows as their number; the story's sender by name
  const nameOf = useCallback((contact: string) => (!contact || contact === item.sender.contact ? item.sender.name : contact), [item.sender.contact, item.sender.name]);

  // The viewer pages through every tile in time order, each with its own message's sender and time
  const entries: ViewerEntry[] = useMemo(() => {
    const at = new Map((messages ?? []).map((m) => [m.id, m]));
    const out: ViewerEntry[] = [];
    for (const row of thread.rows)
      if (row.type === "group")
        for (const block of row.blocks)
          if (block.type === "album") for (const file of block.tiles) out.push({ file, senderName: nameOf(row.senderContact), receivedAt: (file.messageId && at.get(file.messageId)?.receivedAt) || block.at });
    return out;
  }, [thread, messages, nameOf]);

  const indexOf = useMemo(() => new Map(entries.map((e, n) => [e.file.id, n])), [entries]);
  const onOpen = useCallback((file: Attachment) => setOpen(indexOf.get(file.id) ?? null), [indexOf]);
  const onClose = useCallback(() => setOpen(null), []);

  return (
    <>
      {thread.rows.map((row) =>
        row.type === "day" ? (
          <Typography key={`day-${row.key}`} component="p" sx={{ alignSelf: "center", m: 0, px: 1.25, py: 0.5, borderRadius: "7px", backgroundColor: c.dateTag, color: c.dateTagText, fontSize: "0.71875rem", fontWeight: 500, letterSpacing: "0.02em", textTransform: "uppercase", boxShadow: shadow }}>
            {row.label}
          </Typography>
        ) : row.type === "event" ? (
          <DeskEventLine key={row.event.id} event={row.event} c={c} />
        ) : (
          <Group key={row.key} group={row} name={nameOf(row.senderContact)} onOpen={onOpen} onRetry={onRetry} c={c} />
        )
      )}
      <MediaViewer entries={entries} index={open} onIndex={setOpen} onClose={onClose} container={viewerContainer} />
    </>
  );
}
