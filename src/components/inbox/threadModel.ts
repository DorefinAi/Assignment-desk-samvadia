// Turns an item into what ThreadView draws, WhatsApp style: date dividers, the desk's own actions in time
// order, and groups of messages from one sender. Inside a group, back-to-back photos and videos (also
// from media-only messages) merge into one album whose captions are joined. Pure functions, memoised by
// ThreadView.
import { Attachment, DeskEvent, IntakeItem, ThreadMessage } from "@/types/desk";

/** A text bubble: one message's words (and its file rows) */
export interface TextBlock {
  type: "text";
  key: string;
  message: ThreadMessage;
  files: Attachment[];
  /** The email's subject, shown only when it changes partway through the thread */
  subjectChange: string | null;
}

/** An album bubble: photos and videos from one or more messages in a row */
export interface AlbumBlock {
  type: "album";
  key: string;
  tiles: Attachment[];
  /** Documents and other files that came with the media */
  files: Attachment[];
  /** The messages' texts, joined with " · " (WhatsApp captions); empty for email */
  caption: string;
  /** Time of the last message in the album */
  at: string;
}

export type Block = TextBlock | AlbumBlock;

export interface MessageGroup {
  type: "group";
  key: string;
  senderContact: string;
  source: ThreadMessage["source"];
  /** An email reply (any email after the first) */
  reply: boolean;
  blocks: Block[];
}

export type ThreadRow = { type: "day"; key: string; label: string } | { type: "event"; event: DeskEvent } | MessageGroup;

export interface Thread {
  rows: ThreadRow[];
  /** Every tile across the thread, in time order; the viewer pages through these */
  viewable: Attachment[];
}

/** Messages this close together from one sender share a group */
const GROUP_GAP_MS = 10 * 60000;

/** A photo or video that can sit in an album and open in the viewer */
export const isTile = (a: Attachment) => (a.kind === "image" || a.kind === "video") && !!a.thumbUrl && a.state === "downloaded";

const PREFIX = /^\s*((re|fwd?|fw|aw|wg)\s*(\[\d+\])?\s*:\s*)+/i;
/** "Re: Fwd: Subject" and "subject" are the same conversation */
export const normaliseSubject = (s: string | null | undefined) => (s ?? "").replace(PREFIX, "").trim().toLowerCase();

const time = (iso: string) => new Date(iso).getTime() || 0;

/** "Today", "Yesterday" or "17 Oct 2026" */
export function dayLabel(iso: string, now = new Date()) {
  const d = new Date(iso);
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/** What a thread is built from: the parts of an item that change what the chat shows */
export type ThreadSource = Pick<IntakeItem, "id" | "source" | "subject" | "rawText" | "receivedAt" | "messages" | "attachments" | "deskEvents"> & { senderContact: string };

/** The item's messages, or one made from rawText for an older backend that sends none */
export function threadMessages(item: ThreadSource): ThreadMessage[] {
  if (item.messages && item.messages.length > 0) return [...item.messages].sort((a, b) => time(a.receivedAt) - time(b.receivedAt));
  return [{ id: `${item.id}-text`, source: item.source, senderContact: item.senderContact, text: item.rawText, bodyText: item.rawText, subject: item.subject ?? null, receivedAt: item.receivedAt }];
}

export function buildThread(item: ThreadSource): Thread {
  const messages = threadMessages(item);
  const ids = new Set(messages.map((m) => m.id));
  // Media with no (or an unknown) message goes under the first message
  const byMessage = new Map<string, Attachment[]>();
  for (const a of item.attachments) {
    const key = a.messageId && ids.has(a.messageId) ? a.messageId : messages[0].id;
    const list = byMessage.get(key);
    if (list) list.push(a);
    else byMessage.set(key, [a]);
  }

  // Messages and desk events in time order; an event at the same moment as a message comes after it
  const timed: ({ at: number; message: ThreadMessage } | { at: number; event: DeskEvent })[] = [
    ...messages.map((message) => ({ at: time(message.receivedAt), message })),
    ...(item.deskEvents ?? []).map((event) => ({ at: time(event.at), event })),
  ];
  timed.sort((a, b) => a.at - b.at);

  const rows: ThreadRow[] = [];
  const now = new Date();
  let lastDay = "";
  let group: MessageGroup | null = null;
  let groupEnd = 0;
  // The header shows the thread's subject; a bubble only shows one that differs from the one before
  let subject = normaliseSubject(item.subject ?? messages[0].subject);

  for (const entry of timed) {
    const day = new Date(entry.at).toDateString();
    if (day !== lastDay) {
      lastDay = day;
      group = null;
      rows.push({ type: "day", key: day, label: dayLabel(new Date(entry.at).toISOString(), now) });
    }
    if ("event" in entry) {
      group = null;
      rows.push({ type: "event", event: entry.event });
      continue;
    }

    const m = entry.message;
    const email = m.source === "outlook";
    // Each email is its own document, so it always starts a group; WhatsApp groups a sender's burst
    if (!group || email || group.senderContact !== m.senderContact || entry.at - groupEnd > GROUP_GAP_MS) {
      group = { type: "group", key: m.id, senderContact: m.senderContact, source: m.source, reply: email && m.id !== messages[0].id, blocks: [] };
      rows.push(group);
    }
    groupEnd = entry.at;

    const media = byMessage.get(m.id) ?? [];
    const tiles = media.filter(isTile);
    const files = media.filter((a) => !isTile(a));
    const own = normaliseSubject(m.subject);
    const subjectChange = email && own && own !== subject ? (m.subject ?? null) : null;
    if (own) subject = own;
    const words = m.bodyText.trim();

    // Email: the text bubble first, its photos and videos as an album under it.
    // WhatsApp: a message with media is album + caption; one without is a text bubble.
    if (email || tiles.length === 0) {
      if (words || files.length || subjectChange || m.text.trim() !== words || tiles.length === 0) {
        group.blocks.push({ type: "text", key: m.id, message: m, files, subjectChange });
      }
      if (tiles.length) addAlbum(group, { type: "album", key: `${m.id}-album`, tiles, files: [], caption: "", at: m.receivedAt }, email);
    } else {
      addAlbum(group, { type: "album", key: `${m.id}-album`, tiles, files, caption: words, at: m.receivedAt }, email);
    }
  }

  const viewable: Attachment[] = [];
  for (const row of rows) if (row.type === "group") for (const b of row.blocks) if (b.type === "album") viewable.push(...b.tiles);
  return { rows, viewable };
}

/** WhatsApp merges back-to-back media into the album before it; email keeps each message's album apart */
function addAlbum(group: MessageGroup, album: AlbumBlock, email: boolean) {
  const last = group.blocks[group.blocks.length - 1];
  if (!email && last?.type === "album") {
    last.tiles.push(...album.tiles);
    last.files.push(...album.files);
    last.caption = [last.caption, album.caption].filter(Boolean).join(" · ");
    last.at = album.at;
    return;
  }
  group.blocks.push(album);
}

/** Header counts: messages, photos, videos and other files */
export function threadCounts(item: Pick<IntakeItem, "messages" | "attachments">) {
  let photos = 0;
  let videos = 0;
  let files = 0;
  for (const a of item.attachments) {
    if (a.kind === "image") photos++;
    else if (a.kind === "video") videos++;
    else files++;
  }
  return { messages: item.messages?.length ?? 0, photos, videos, files };
}

/** "2:05", or "1:02:05" past an hour */
export function duration(sec: number | null | undefined) {
  if (!sec || sec < 0) return "";
  const s = Math.round(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${r}` : `${m}:${r}`;
}

export const clockTime = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });

export const fileExt = (name: string) => name.split(".").pop()?.toUpperCase() ?? "";

/** "86 MB", "2.4 MB", "340 KB" */
export const sizeLabel = (mb: number) => (mb >= 10 ? `${Math.round(mb)} MB` : mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(mb * 1024))} KB`);

/** "1 photo", "2 photos" */
export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
