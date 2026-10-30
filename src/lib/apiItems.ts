// The backend's item JSON (app/serialize.py item_out) and how it becomes the desk's IntakeItem.
import { AiSuggestion, Attachment, AttachmentKind, District, DownloadState, Footage, FOOTAGE_STATUSES, FootageStatus, FtpListing, IntakeItem, ITEM_KINDS, ItemKind, KindCounts, ParsedSlug, Priority, Source, Stage } from "@/types/desk";

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
}

export interface ApiMessage {
  id: string;
  text: string;
  subject: string | null;
  received_at: string;
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
  review_state: "pending" | "approved" | "rejected";
  reject_reason: string | null;
  reject_note: string | null;
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
const REJECT_LABELS: Record<string, string> = {
  duplicate: "Duplicate of another story",
  not_newsworthy: "Not news / advertising",
  unverified: "Can't verify",
  no_visuals: "Visuals not usable",
  other: "Other",
};

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

function toAttachment(m: ApiMedia): Attachment {
  return {
    id: m.id,
    fileName: m.original_name || m.file_name || `${m.kind} file`,
    kind: KINDS.includes(m.kind as AttachmentKind) ? (m.kind as AttachmentKind) : "document",
    sizeMb: (m.size_bytes ?? 0) / (1024 * 1024),
    state: DOWNLOAD_STATE[m.state] ?? "failed",
    progress: 0,
  };
}

function toStage(item: ApiItem): Stage {
  if (item.review_state === "rejected") return "rejected";
  if (item.review_state === "pending") return "new";
  // Approved: in the feed once the files are on FTP
  return item.intake_state === "on_ftp" ? "published" : "filing";
}

export function toIntakeItem(item: ApiItem): IntakeItem {
  const messages = item.messages ?? [];
  const rawText = messages.map((m) => m.text).filter(Boolean).join("\n\n") || item.body || "";
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
    rejectReason: item.review_state === "rejected" ? item.reject_note || REJECT_LABELS[item.reject_reason ?? "other"] : undefined,
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
  return { ...next, body: next.body ?? prev.body, media: next.media ?? prev.media, messages: next.messages ?? prev.messages };
}
