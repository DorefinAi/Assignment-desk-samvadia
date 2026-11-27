// Data model for the assignment desk intake flow:
// WhatsApp / Outlook message -> media download -> review + AI suggestions -> approve
// -> FTP folder (slug) -> RSS feed entry that Octopus pulls.

/** portal: filed by a reporter in the reporter app */
export type Source = "whatsapp" | "outlook" | "portal";

export type Stage = "new" | "rejected" | "filing" | "filed" | "published";

/** The backend's review_state (app/models.py REVIEW_STATES) */
export type ReviewState = "pending" | "approved" | "rejected" | "held" | "sent_back" | "duplicate";

/** Waiting for the desk to decide: new or held. A sent-back story waits on the reporter, so badges leave it out
 *  (it still lists under "To review", so the desk can find it). */
export const needsDecision = (item: { stage: Stage; reviewState?: ReviewState }) =>
  item.stage === "new" && item.reviewState !== "sent_back";

export type Priority = "normal" | "high" | "breaking";

export type AttachmentKind = "video" | "image" | "audio" | "document";

export type DownloadState = "downloading" | "downloaded" | "failed";

export interface Attachment {
  id: string;
  /** File name as it arrived from WhatsApp / Outlook */
  fileName: string;
  kind: AttachmentKind;
  sizeMb: number;
  state: DownloadState;
  /** 0-100 while downloading */
  progress: number;
  /** The message it came with; null or missing puts it under the first message */
  messageId?: string | null;
  width?: number | null;
  height?: number | null;
  durationSec?: number | null;
  /** Small still for the chat grid; full URL. Without it the file shows as a row, not a tile. */
  thumbUrl?: string | null;
  /** Viewer copy: a JPEG for photos, a 480p MP4 for videos; full URL */
  previewUrl?: string | null;
  /** Where the original sits on the FTP, once it is there */
  ftpPath?: string | null;
}

/** One WhatsApp message or one email in the story's thread */
export interface ThreadMessage {
  id: string;
  source: Source;
  /** Phone number or email address; empty when the backend left it out */
  senderContact: string;
  /** As received, quoted reply history included */
  text: string;
  /** The new part only (quoted history stripped); same as text when nothing was stripped */
  bodyText: string;
  subject?: string | null;
  receivedAt: string;
}

/** Something the desk did to the story, shown between the messages at the time it happened */
export interface DeskEvent {
  id: string;
  at: string;
  kind: "sent_back" | "rejected" | "held" | "note" | "approved" | "duplicate" | "reopened";
  /** Who did it */
  by?: string;
  text: string;
}

export interface Sender {
  name: string;
  /** Phone number for WhatsApp, email address for Outlook */
  contact: string;
  role: "Reporter" | "Stringer" | "Press release" | "Agency" | "Unknown sender";
}

export interface AiFlag {
  kind: "duplicate" | "verify" | "missing_media" | "location";
  text: string;
}

export interface AiSuggestion {
  headlines: string[];
  summary: string;
  body: string;
  category: string;
  locationCode: string;
  priority: Priority;
  /** English keywords the slug is built from */
  keywords: string[];
  confidence: number;
  flags: AiFlag[];
}

export interface StoryDraft {
  headline: string;
  body: string;
  category: string;
  locationCode: string;
  priority: Priority;
  slug: string;
  /** True once someone types their own slug; stops it being regenerated */
  slugEdited: boolean;
}

export interface IntakeItem {
  id: string;
  source: Source;
  sender: Sender;
  /** WhatsApp group or chat name */
  chat?: string;
  /** Outlook subject line */
  subject?: string;
  receivedAt: string;
  /** Every message's text joined, for search and the editor */
  rawText: string;
  attachments: Attachment[];
  /** The messages in the story; missing on an older backend, which then shows rawText as one message */
  messages?: ThreadMessage[];
  /** Desk decisions with a time (backend desk_events, or the demo data) */
  deskEvents?: DeskEvent[];
  ai: AiSuggestion;
  /** Which of ai.headlines the AI panel is showing */
  aiHeadlineIndex: number;
  draft: StoryDraft;
  stage: Stage;
  /** Backend only: held and sent_back show as stage "new", duplicate as "rejected"; this tells them apart */
  reviewState?: ReviewState;
  rejectReason?: string;
  reviewedBy?: string;
  folderId?: string;
  /** Backend only: why the story is waiting on the desk, e.g. "Unknown sender: pick a reporter to build the slug." */
  intakeNote?: string;
  /** Backend only: the matched reporter; empty for an unknown sender */
  reporterId?: string;
  /** Backend only: shadow-mode item; the AI suggestions stay hidden for it */
  blind?: boolean;
  /** The backend left out the story text, files and messages (only sent to people who can open the inbox) */
  partial?: boolean;
  /** Build 1 backend only. Each is missing on an older backend, and the UI piece that shows it stays hidden. */
  reporterSlug?: string | null;
  parsed?: ParsedSlug | null;
  district?: District | null;
  kind?: ItemKind;
  footage?: Footage;
}

// --- Build 1: reporter slug, district, kind and FTP footage --------------------------------------

export type ItemKind = "story" | "press_release" | "day_plan" | "not_a_story";
export const ITEM_KINDS: ItemKind[] = ["story", "press_release", "day_plan", "not_a_story"];
export type KindCounts = Record<ItemKind, number>;

/** What the backend read out of the reporter's slug; every field may be null */
export interface ParsedSlug {
  date: string | null;
  cityToken: string | null;
  /** AV, AVB, PKG, SPL, WT, 121, PTC, GFX, VOXPOP */
  type: string | null;
  reporterName: string | null;
}

export interface District {
  code: string;
  name: string;
  nameHi?: string | null;
  /** Only from GET /desk/districts */
  ftpFolder?: string | null;
}

export type FootageStatus = "not_checked" | "waiting" | "found" | "not_found" | "manual";
export const FOOTAGE_STATUSES: FootageStatus[] = ["not_checked", "waiting", "found", "not_found", "manual"];

export interface FootageFile {
  name: string;
  bytes: number;
  modified: string | null;
}

export interface Footage {
  status: FootageStatus;
  path: string | null;
  files: FootageFile[];
  bytes: number;
  checkedAt: string | null;
  waitUntil: string | null;
}

/** One row of GET /desk/ftp/browse */
export interface FtpEntry {
  name: string;
  dir: boolean;
  bytes: number | null;
  modified: string | null;
}

export interface FtpListing {
  path: string;
  entries: FtpEntry[];
}

/** One match from GET /desk/items/{id}/footage/search */
export interface FootageHit extends FtpEntry {
  path: string;
}

export interface FootageSearch {
  /** Everything that matched; `results` may hold fewer */
  total: number;
  results: FootageHit[];
}

export interface FootageSearchQuery {
  q: string;
  /** Days before and after the story's dates, 0-7 */
  days: number;
  /** District code; null for the story's own */
  district: string | null;
  /** Read the FTP again instead of the backend's cached listings */
  fresh?: boolean;
}

/** Inbox time window. Custom times are IST wall-clock values ("2026-10-27T09:30"). */
export type RangePreset = "any" | "1h" | "today" | "24h" | "custom";

export interface InboxFilters {
  range: RangePreset;
  customFrom: string;
  customTo: string;
  kind: ItemKind;
  /** District code, or null for every district */
  district: string | null;
}

export const DEFAULT_FILTERS: InboxFilters = { range: "any", customFrom: "", customTo: "", kind: "story", district: null };

export interface FtpFolder {
  id: string;
  itemId: string;
  slug: string;
  locationCode: string;
  /** yyyy-mm-dd */
  date: string;
  /** Attachment ids copied into the folder, in order */
  attachmentIds: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface FeedEntry {
  id: string;
  itemId: string;
  folderId: string;
  publishedAt: string;
  updatedAt?: string;
  live: boolean;
  /** Set when Octopus has read the entry since it last changed */
  pulledAt?: string;
}

export interface FetchRun {
  id: string;
  source: Source | "octopus";
  at: string;
  added: number;
  titles: string[];
}

export interface ActivityEntry {
  id: string;
  at: string;
  text: string;
  tone: "info" | "success" | "error";
}
