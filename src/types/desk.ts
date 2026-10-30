// Data model for the assignment desk intake flow:
// WhatsApp / Outlook message -> media download -> review + AI suggestions -> approve
// -> FTP folder (slug) -> RSS feed entry that Octopus pulls.

/** portal: filed by a reporter in the reporter app */
export type Source = "whatsapp" | "outlook" | "portal";

export type Stage = "new" | "rejected" | "filing" | "filed" | "published";

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
  rawText: string;
  attachments: Attachment[];
  ai: AiSuggestion;
  /** Which of ai.headlines the AI panel is showing */
  aiHeadlineIndex: number;
  draft: StoryDraft;
  stage: Stage;
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
