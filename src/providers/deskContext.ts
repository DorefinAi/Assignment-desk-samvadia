"use client";

// What every desk screen reads and calls. Two providers fill it: the demo one (sample data, the default)
// and the backend one (NEXT_PUBLIC_API_URL set). Screens never know which one they have.
import { createContext, useContext } from "react";
import { ActivityEntry, FeedEntry, FetchRun, FtpFolder, IntakeItem, StoryDraft } from "@/types/desk";
import { Role } from "@/lib/rbac";
import { DeskUser } from "@/data/users";

/** What one click on Refresh brought in */
export interface RefreshResult {
  whatsapp: number;
  outlook: number;
  /** Feed entries Octopus has read since the last refresh */
  octopus: number;
}

/** A reporter the desk can pick for a story from an unknown sender */
export interface ReporterOption {
  id: string;
  name: string;
  cityCode: string;
  slugCode: string;
}

export interface DeskContextValue {
  items: IntakeItem[];
  folders: FtpFolder[];
  feed: FeedEntry[];
  runs: FetchRun[];
  activity: ActivityEntry[];
  reviewer: string;
  role: Role;
  users: DeskUser[];
  /** Reporters for the picker; empty on demo data */
  reporters: ReporterOption[];
  /** True when the desk reads and writes the real backend */
  live: boolean;
  /** Last thing the backend refused or failed, in plain words; null when all is well */
  notice: string | null;
  dismissNotice: () => void;
  setUserRole: (userId: string, role: Role) => void;
  refresh: () => RefreshResult;
  updateDraft: (id: string, patch: Partial<StoryDraft>) => void;
  resetSlug: (id: string) => void;
  setReporter: (id: string, reporterId: string) => void;
  applyAi: (id: string, part: "headline" | "body" | "all") => void;
  cycleAiHeadline: (id: string) => void;
  approve: (id: string) => void;
  reject: (id: string, reason: string) => void;
  reopen: (id: string) => void;
  retryDownload: (itemId: string, attachmentId: string) => void;
  renameFolder: (folderId: string, slug: string, locationCode: string) => string | null;
  pushFeedUpdate: (itemId: string) => void;
  setFeedLive: (entryId: string, live: boolean) => void;
}

export const DeskContext = createContext<DeskContextValue | null>(null);

export function useDesk() {
  const ctx = useContext(DeskContext);
  if (!ctx) throw new Error("useDesk must be used inside DeskProvider");
  return ctx;
}
