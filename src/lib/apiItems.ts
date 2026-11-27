// The backend's item JSON (app/serialize.py item_out) and how it becomes the desk's IntakeItem.
import { API_URL } from "./api";
import { AiSuggestion, Attachment, AttachmentKind, DeskEvent, District, DownloadState, Footage, FOOTAGE_STATUSES, FootageSearch, FootageStatus, FtpListing, IntakeItem, ITEM_KINDS, ItemKind, KindCounts, ParsedSlug, Priority, ReviewState, Source, Stage, ThreadMessage } from "@/types/desk";

export interface ApiReporter {
  id: string;
  name: string;
  slug_code: string;
  city_code: string;
  district: string | null;
  /** Build 1 (contract section 3); an older backend has city_code and one email instead */
  district_code?: string | null;
  emails?: string[] | null;
  email?: string | null;
  phone?: string | null;
  active?: boolean;
}

export interface ApiDistrict {
  code: string;
  name: string;
  name_hi?: string | null;
  ftp_folder?: string | null;
}

export interface ApiFootage {
  status: string;
  path: string | null;
  files?: { name: string; size?: number | null; modified?: string | null }[] | null;
  bytes?: number | null;
  checked_at?: string | null;
  wait_until?: string | null;
}

export interface ApiParsed {
  date?: string | null;
  city_token?: string | null;
  type?: string | null;
  reporter_name?: string | null;
}

export interface ApiMedia {
  id: string;
  kind: string;
  original_name: string | null;
  file_name: string | null;
  content_type: string | null;
  size_bytes: number | null;
  state: string;
  ftp_path: string | null;
  error: string | null;
  // Thread view; all optional so an older backend still maps
  message_id?: string | null;
  width?: number | null;
  height?: number | null;
  duration_seconds?: number | null;
  /** "/media/{id}/thumb", relative to the API */
  thumb_url?: string | null;
  /** "/media/{id}/preview": a JPEG for photos, a 480p MP4 for videos */
  preview_url?: string | null;
}

export interface ApiMessage {
  id: string;
  text: string;
  subject: string | null;
  received_at: string;
  source?: Source | null;
  sender_contact?: string | null;
  /** The text with quoted reply history stripped; missing on an older backend */
  body_text?: string | null;
}

export interface ApiItem {
  id: string;
  source: Source;
  headline: string;
  body?: string;
  slug: string | null;
  slug_edited: boolean;
  category: string | null;
  priority: Priority;
  location_code: string | null;
  sender_name: string | null;
  sender_contact: string | null;
  reporter: ApiReporter | null;
  intake_state: string;
  intake_note: string | null;
  review_state: ReviewState;
  reject_reason: string | null;
  reject_note: string | null;
  /** Desk answers only: who made the last decision, and every decision for the chat (desk_events with full=true) */
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  desk_events?: ApiDeskEvent[];
  ftp_folder: string | null;
  received_at: string;
  version: number;
  blind: boolean;
  media?: ApiMedia[];
  messages?: ApiMessage[];
  // Build 1; all optional so an older backend still maps
  reporter_slug?: string | null;
  slug_key?: string | null;
  parsed?: ApiParsed | null;
  district?: ApiDistrict | null;
  kind?: string | null;
  footage?: ApiFootage | null;
}

/** GET /desk/items. kind_counts only comes from a build 1 backend. */
export interface ApiItemList {
  items: ApiItem[];
  kind_counts?: Partial<KindCounts> | null;
}

export function toKindCounts(raw: Partial<KindCounts> | null | undefined): KindCounts | null {
  if (!raw || typeof raw !== "object") return null;
  return { story: raw.story ?? 0, press_release: raw.press_release ?? 0, day_plan: raw.day_plan ?? 0, not_a_story: raw.not_a_story ?? 0 };
}

export function toDistrict(d: ApiDistrict | null | undefined): District | null {
  if (!d || typeof d.code !== "string") return null;
  return { code: d.code, name: d.name || d.code, nameHi: d.name_hi ?? null, ftpFolder: d.ftp_folder ?? null };
}

function toParsed(p: ApiParsed | null | undefined): ParsedSlug | null {
  if (!p) return null;
  const parsed = { date: p.date ?? null, cityToken: p.city_token ?? null, type: p.type ?? null, reporterName: p.reporter_name ?? null };
  return Object.values(parsed).some((v) => v !== null) ? parsed : null;
}

function toFootage(f: ApiFootage | null | undefined): Footage | undefined {
  if (!f || !FOOTAGE_STATUSES.includes(f.status as FootageStatus)) return undefined;
  const files = (f.files ?? []).map((x) => ({ name: x.name, bytes: x.size ?? 0, modified: x.modified ?? null }));
  return {
    status: f.status as FootageStatus,
    path: f.path ?? null,
    files,
    bytes: f.bytes ?? files.reduce((sum, x) => sum + x.bytes, 0),
    checkedAt: f.checked_at ?? null,
    waitUntil: f.wait_until ?? null,
  };
}

/** GET /desk/ftp/browse; entry sizes come as "size" */
export function toFtpListing(raw: { path: string; entries?: { name: string; dir: boolean; size?: number | null; modified?: string | null }[] }): FtpListing {
  return { path: raw.path, entries: (raw.entries ?? []).map((e) => ({ name: e.name, dir: !!e.dir, bytes: e.size ?? null, modified: e.modified ?? null })) };
}

export function toFootageSearch(raw: { total?: number; results?: { name: string; path: string; dir: boolean; size?: number | null; modified?: string | null }[] }): FootageSearch {
  const results = (raw.results ?? []).map((e) => ({ name: e.name, path: e.path, dir: !!e.dir, bytes: e.dir ? null : (e.size ?? null), modified: e.modified ?? null }));
  return { total: raw.total ?? results.length, results };
}

/** Footage endpoints answer with the full item, bare or as {item} like the other actions */
export const itemOf = (res: ApiItem | { item: ApiItem }): ApiItem => ("item" in res && res.item ? res.item : (res as ApiItem));

/** The desk's reject reasons, as the backend's reason codes. "Other" (or anything unknown) goes as "other" with the note. */
const REJECT_CODES: Record<string, string> = {
  "Duplicate of another story": "duplicate",
  "Not news / advertising": "not_newsworthy",
  "Already covered": "duplicate",
  "Can't verify": "unverified",
  "Visuals not usable": "no_visuals",
};
/** Every backend reject code (alembic 0005); the first five use the desk dialog's wording */
const REJECT_LABELS: Record<string, string> = {
  duplicate: "Duplicate of another story",
  not_newsworthy: "Not news / advertising",
  unverified: "Can't verify",
  no_visuals: "Visuals not usable",
  other: "Other",
  pr_puff: "Release / event, no news value",
  routine_event: "Routine diary event",
  incomplete: "Missing quote / key facts",
  wrong_beat: "Not our coverage area",
  too_late: "Missed the slot / stale",
  legal_risk: "Legal risk",
  communal_risk: "Communally sensitive",
  quality: "Copy unusable",
};

/** "Reason: note". The label is left out when the note already says it, or when the reason is just "other". */
export function rejectText(code: string | null | undefined, note: string | null | undefined): string {
  const label = REJECT_LABELS[code ?? "other"] ?? code ?? "Other";
  const text = (note ?? "").trim();
  if (!text) return label;
  if ((code ?? "other") === "other" || text.startsWith(label)) return text;
  return `${label}: ${text}`;
}

export interface ApiDeskEvent {
  id: string;
  action: string;
  at: string;
  by: string | null;
  reject_reason: string | null;
  note: string | null;
  duplicate_of?: string | null;
}

const EVENT_KIND: Record<string, DeskEvent["kind"]> = {
  approve: "approved", reject: "rejected", hold: "held", needs_more: "sent_back", duplicate: "duplicate", reopen: "reopened",
};

export function toDeskEvent(e: ApiDeskEvent): DeskEvent {
  const kind = EVENT_KIND[e.action] ?? "note";
  return { id: e.id, at: e.at, kind, by: e.by ?? undefined, text: kind === "rejected" ? rejectText(e.reject_reason, e.note) : (e.note ?? "") };
}

export function rejectBody(reason: string, note = ""): { reason: string; note?: string } {
  const code = REJECT_CODES[reason];
  if (!code) return { reason: "other", note: note || (reason === "Other" ? undefined : reason) };
  // "Already covered" shares the duplicate code, so its label goes into the note
  const label = reason === "Already covered" ? reason : "";
  return { reason: code, note: [label, note].filter(Boolean).join(": ") || undefined };
}

/** No AI model yet: an empty suggestion, which hides every sparkle. */
export const NO_AI: AiSuggestion = { headlines: [], summary: "", body: "", category: "", locationCode: "", priority: "normal", keywords: [], confidence: 0, flags: [] };

const KINDS: AttachmentKind[] = ["video", "image", "audio", "document"];

// in_storage and on_ftp are both "we have the file"; link_only (a OneDrive link) counts as not downloaded
const DOWNLOAD_STATE: Record<string, DownloadState> = { in_storage: "downloaded", on_ftp: "downloaded", downloading: "downloading", awaiting_upload: "downloading" };

/** Media links come relative to the API. They are cookie-authenticated, so they go straight into <img>/<video>. */
const mediaUrl = (path: string | null | undefined) => (!path ? null : /^(https?:|data:|blob:)/.test(path) ? path : API_URL + path);
const num = (n: number | null | undefined) => (typeof n === "number" && Number.isFinite(n) && n > 0 ? n : null);

function toAttachment(m: ApiMedia): Attachment {
  return {
    id: m.id,
    fileName: m.original_name || m.file_name || `${m.kind} file`,
    kind: KINDS.includes(m.kind as AttachmentKind) ? (m.kind as AttachmentKind) : "document",
    sizeMb: (m.size_bytes ?? 0) / (1024 * 1024),
    state: DOWNLOAD_STATE[m.state] ?? "failed",
    progress: 0,
    messageId: m.message_id ?? null,
    width: num(m.width),
    height: num(m.height),
    durationSec: num(m.duration_seconds),
    thumbUrl: mediaUrl(m.thumb_url),
    previewUrl: mediaUrl(m.preview_url),
    ftpPath: m.ftp_path ?? null,
  };
}

function toMessage(m: ApiMessage, item: ApiItem): ThreadMessage {
  const text = m.text ?? "";
  return {
    id: m.id,
    source: m.source ?? item.source,
    senderContact: m.sender_contact ?? item.sender_contact ?? "",
    text,
    bodyText: m.body_text?.trim() ? m.body_text : text,
    subject: m.subject,
    receivedAt: m.received_at,
  };
}

function toStage(item: ApiItem): Stage {
  // A duplicate is a kind of reject; held and sent back are still the desk's to decide
  if (item.review_state === "rejected" || item.review_state === "duplicate") return "rejected";
  if (item.review_state === "pending" || item.review_state === "held" || item.review_state === "sent_back") return "new";
  // Approved: in the feed once the files are on FTP
  return item.intake_state === "on_ftp" ? "published" : "filing";
}

export function toIntakeItem(item: ApiItem): IntakeItem {
  const messages = item.messages ?? [];
  // The new part of each message; quoted history would repeat the earlier ones
  const rawText = messages.map((m) => m.body_text || m.text).filter(Boolean).join("\n\n") || item.body || "";
  const known = !!item.reporter;
  return {
    id: item.id,
    source: item.source,
    sender: {
      name: item.sender_name || item.reporter?.name || item.sender_contact || "Unknown sender",
      contact: item.sender_contact ?? "",
      role: known ? "Reporter" : item.source === "outlook" ? "Press release" : "Unknown sender",
    },
    subject: item.source === "outlook" ? (messages.find((m) => m.subject)?.subject ?? item.headline) : undefined,
    receivedAt: item.received_at,
    rawText,
    attachments: (item.media ?? []).map(toAttachment),
    messages: item.messages ? item.messages.map((m) => toMessage(m, item)) : undefined,
    ai: NO_AI,
    aiHeadlineIndex: 0,
    draft: {
      headline: item.headline,
      body: item.body ?? "",
      category: item.category ?? "",
      locationCode: item.location_code ?? "",
      priority: item.priority,
      slug: item.slug ?? "",
      slugEdited: item.slug_edited,
    },
    stage: toStage(item),
    reviewState: item.review_state,
    rejectReason:
      item.review_state === "rejected" ? rejectText(item.reject_reason, item.reject_note)
      : item.review_state === "duplicate" ? rejectText("duplicate", item.reject_note)
      : undefined,
    reviewedBy: item.reviewed_by ?? undefined,
    deskEvents: item.desk_events?.map(toDeskEvent),
    folderId: item.ftp_folder ? item.id : undefined,
    intakeNote: item.intake_note ?? undefined,
    reporterId: item.reporter?.id,
    blind: item.blind,
    reporterSlug: item.reporter_slug ?? null,
    parsed: toParsed(item.parsed),
    district: toDistrict(item.district),
    kind: ITEM_KINDS.includes(item.kind as ItemKind) ? (item.kind as ItemKind) : undefined,
    footage: toFootage(item.footage),
    partial: item.body === undefined || item.media === undefined,
  };
}

/** A write response or list row without body/media/messages (caller can't open the inbox) must not wipe
 *  what is already known about the story: keep the earlier copy's values for whatever was left out. */
export function keepDetail(next: ApiItem, prev: ApiItem | undefined): ApiItem {
  if (!prev) return next;
  return { ...next, body: next.body ?? prev.body, media: next.media ?? prev.media, messages: next.messages ?? prev.messages, desk_events: next.desk_events ?? prev.desk_events };
}
