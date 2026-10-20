// The backend's item JSON (app/serialize.py item_out) and how it becomes the desk's IntakeItem.
import { AiSuggestion, Attachment, AttachmentKind, DownloadState, IntakeItem, Priority, Source, Stage } from "@/types/desk";

export interface ApiReporter {
  id: string;
  name: string;
  slug_code: string;
  city_code: string;
  district: string | null;
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
}

/** The desk's reject chips, as the backend's reason codes. Anything typed by hand goes as "other" with the text as the note. */
const REJECT_CODES: Record<string, string> = {
  "Duplicate of another story": "duplicate",
  "Not news / advertising": "not_newsworthy",
  "Already covered": "duplicate",
  "Can't verify": "unverified",
  "Visuals not usable": "poor_visuals",
};
const REJECT_LABELS: Record<string, string> = {
  duplicate: "Duplicate of another story",
  not_newsworthy: "Not news / advertising",
  unverified: "Can't verify",
  poor_visuals: "Visuals not usable",
  other: "Other",
};

export function rejectBody(reason: string): { reason: string; note?: string } {
  const code = REJECT_CODES[reason];
  return code ? { reason: code, note: reason === "Already covered" ? reason : undefined } : { reason: "other", note: reason };
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
  };
}
