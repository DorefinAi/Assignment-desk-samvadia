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
}

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
