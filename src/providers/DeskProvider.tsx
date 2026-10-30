"use client";

import React, { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityEntry, DEFAULT_FILTERS, FeedEntry, FetchRun, FtpFolder, InboxFilters, IntakeItem, StoryDraft } from "@/types/desk";
import { matchesFilters } from "@/lib/ist";
import { buildInitialState, DeskState, INCOMING, toIncomingItem } from "@/data/intakeData";
import { buildSlug, dayOf, relocateSlug, slugError, uniqueSlug } from "@/lib/slug";
import { Access, assignableRoles, canManageUser, Role, ROLE_META } from "@/lib/rbac";
import { DeskUser, USERS } from "@/data/users";
import { apiEnabled } from "@/lib/api";
import { DeskContext, DeskContextValue, RefreshResult } from "./deskContext";
import ApiDeskProvider from "./ApiDeskProvider";

export { useDesk } from "./deskContext";
export type { RefreshResult } from "./deskContext";

/** Pause between pipeline steps so the desk can see each one happen */
const STEP_MS = 900;

const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Simulated download speed: bigger files take longer. */
const stepFor = (sizeMb: number) => Math.min(100, Math.max(3, Math.round(320 / sizeMb)));

const log = (s: DeskState, text: string, tone: ActivityEntry["tone"] = "info"): DeskState => ({
  ...s,
  activity: [{ id: uid("act"), at: new Date().toISOString(), text, tone }, ...s.activity].slice(0, 60),
});

const patchItem = (s: DeskState, id: string, fn: (item: IntakeItem) => IntakeItem): DeskState => ({
  ...s,
  items: s.items.map((it) => (it.id === id ? fn(it) : it)),
});

/** The backend when NEXT_PUBLIC_API_URL is set; otherwise the sample data below. */
export function DeskProvider(props: { reviewer: string; access: Access; children: ReactNode }) {
  return apiEnabled ? <ApiDeskProvider {...props} /> : <DemoDeskProvider {...props} />;
}

function DemoDeskProvider({ reviewer, access, children }: { reviewer: string; access: Access; children: ReactNode }) {
  const role = access.role;
  const [state, setState] = useState<DeskState>(buildInitialState);
  // Sample data has no kind, district or footage, so only the time filter does anything here
  const [filters, setFilterState] = useState<InboxFilters>(DEFAULT_FILTERS);
  const setFilters = useCallback((patch: Partial<InboxFilters>) => setFilterState((f) => ({ ...f, ...patch })), []);
  const shownItems = useMemo(() => state.items.filter((i) => matchesFilters(i, filters)), [state.items, filters]);
  // The signed-in user shows with the role they signed in as
  const [users, setUsers] = useState<DeskUser[]>(() => USERS.map((u) => (u.username === reviewer ? { ...u, role } : u)));
  const queue = useRef({ whatsapp: INCOMING.filter((s) => s.source === "whatsapp"), outlook: INCOMING.filter((s) => s.source === "outlook") });
  const refreshes = useRef(0);

  // ─── Intake ────────────────────────────────────────────────────────────────
  // In production a background cron pulls WhatsApp, Outlook and the Octopus read
  // status; Refresh just asks for whatever has arrived since the last look.

  /** One inbox check. `deliver` is false for checks that find nothing new. */
  const pullFrom = useCallback((source: "whatsapp" | "outlook", deliver: boolean) => {
    const seed = deliver ? queue.current[source].shift() : undefined;
    const item = seed ? toIncomingItem(seed) : null;
    setState((s) => {
      const run: FetchRun = { id: uid("run"), source, at: new Date().toISOString(), added: item ? 1 : 0, titles: item ? [item.draft.headline] : [] };
      const next = { ...s, runs: [run, ...s.runs].slice(0, 40) };
      if (!item || s.items.some((it) => it.id === item.id)) return next;
      return log({ ...next, items: [item, ...next.items] }, `New ${source === "whatsapp" ? "WhatsApp message" : "email"} from ${item.sender.name}`);
    });
    return item ? 1 : 0;
  }, []);

  const refresh = useCallback((): RefreshResult => {
    // Dummy data: one new message per refresh, alternating sources, until the queue runs out
    const whatsappFirst = refreshes.current++ % 2 === 0;
    let whatsapp = 0;
    let outlook = 0;
    if (whatsappFirst) {
      whatsapp = pullFrom("whatsapp", true);
      outlook = pullFrom("outlook", !whatsapp);
    } else {
      outlook = pullFrom("outlook", true);
      whatsapp = pullFrom("whatsapp", !outlook);
    }

    // Octopus has read everything that was waiting
    const at = new Date().toISOString();
    const octopus = state.feed.filter((e) => e.live && !e.pulledAt).length;
    setState((s) => ({
      ...s,
      runs: [{ id: uid("run"), source: "octopus" as const, at, added: octopus, titles: [] }, ...s.runs].slice(0, 40),
      feed: s.feed.map((e) => (e.live && !e.pulledAt ? { ...e, pulledAt: at } : e)),
    }));

    return { whatsapp, outlook, octopus };
  }, [pullFrom, state.feed]);

  // ─── Access ────────────────────────────────────────────────────────────────
  const setUserRole = useCallback(
    (userId: string, next: Role) => {
      const target = users.find((u) => u.id === userId);
      if (!target || !canManageUser(access, target.role) || !assignableRoles(role).includes(next)) return;
      setUsers((list) => list.map((u) => (u.id === userId ? { ...u, role: next } : u)));
      setState((s) => log(s, `Made ${target.name} ${ROLE_META[next].label.toLowerCase()}`));
    },
    [access, role, users]
  );

  // WhatsApp media downloads
  const downloading = state.items.some((it) => it.attachments.some((a) => a.state === "downloading"));
  useEffect(() => {
    if (!downloading) return;
    const timer = setInterval(() => {
      setState((s) => ({
        ...s,
        items: s.items.map((it) =>
          it.attachments.some((a) => a.state === "downloading")
            ? {
                ...it,
                attachments: it.attachments.map((a) => {
                  if (a.state !== "downloading") return a;
                  const progress = Math.min(100, a.progress + stepFor(a.sizeMb));
                  return { ...a, progress, state: progress >= 100 ? "downloaded" : "downloading" };
                }),
              }
            : it
        ),
      }));
    }, 1000);
    return () => clearInterval(timer);
  }, [downloading]);

  const retryDownload = useCallback((itemId: string, attachmentId: string) => {
    setState((s) =>
      patchItem(s, itemId, (it) => ({
        ...it,
        attachments: it.attachments.map((a) => (a.id === attachmentId ? { ...a, state: "downloading", progress: 0 } : a)),
      }))
    );
  }, []);

  // ─── Editing ───────────────────────────────────────────────────────────────
  const updateDraft = useCallback((id: string, patch: Partial<StoryDraft>) => {
    setState((s) =>
      patchItem(s, id, (it) => {
        const draft = { ...it.draft, ...patch };
        if (patch.slug !== undefined) draft.slugEdited = true;
        if (patch.locationCode && patch.locationCode !== it.draft.locationCode && patch.slug === undefined) {
          draft.slug = draft.slugEdited ? relocateSlug(draft.slug, it.draft.locationCode, patch.locationCode) : buildSlug(patch.locationCode, it.ai.keywords);
        }
        return { ...it, draft };
      })
    );
  }, []);

  const resetSlug = useCallback((id: string) => {
    setState((s) => patchItem(s, id, (it) => ({ ...it, draft: { ...it.draft, slug: buildSlug(it.draft.locationCode, it.ai.keywords), slugEdited: false } })));
  }, []);

  const applyAi = useCallback((id: string, part: "headline" | "body" | "all") => {
    setState((s) =>
      patchItem(s, id, (it) => {
        const headline = it.ai.headlines[it.aiHeadlineIndex];
        if (part === "headline") return { ...it, draft: { ...it.draft, headline } };
        if (part === "body") return { ...it, draft: { ...it.draft, body: it.ai.body } };
        return {
          ...it,
          draft: {
            ...it.draft,
            headline,
            body: it.ai.body,
            category: it.ai.category,
            locationCode: it.ai.locationCode,
            priority: it.ai.priority,
            slug: buildSlug(it.ai.locationCode, it.ai.keywords),
            slugEdited: false,
          },
        };
      })
    );
  }, []);

  const cycleAiHeadline = useCallback((id: string) => {
    setState((s) => patchItem(s, id, (it) => ({ ...it, aiHeadlineIndex: (it.aiHeadlineIndex + 1) % it.ai.headlines.length })));
  }, []);

  // ─── Decisions ─────────────────────────────────────────────────────────────
  const approve = useCallback(
    (id: string) => {
      setState((s) => log(patchItem(s, id, (it) => ({ ...it, stage: "filing", reviewedBy: reviewer, rejectReason: undefined })), `Approved “${s.items.find((i) => i.id === id)?.draft.headline}”`, "success"));

      // Step 1: create the FTP folder and copy the downloaded media into it
      setTimeout(() => {
        setState((s) => {
          const item = s.items.find((it) => it.id === id);
          if (!item || item.stage !== "filing") return s;
          const date = dayOf(item.receivedAt);
          const taken = s.folders.filter((f) => f.date === date && f.locationCode === item.draft.locationCode).map((f) => f.slug);
          const slug = uniqueSlug(item.draft.slug, taken);
          const folder: FtpFolder = {
            id: uid("fld"),
            itemId: id,
            slug,
            locationCode: item.draft.locationCode,
            date,
            attachmentIds: item.attachments.filter((a) => a.state === "downloaded").map((a) => a.id),
            createdAt: new Date().toISOString(),
          };
          const next = patchItem({ ...s, folders: [folder, ...s.folders] }, id, (it) => ({ ...it, stage: "filed", folderId: folder.id, draft: { ...it.draft, slug } }));
          return log(next, slug === item.draft.slug ? `Created FTP folder ${slug}` : `Created FTP folder ${slug} (${item.draft.slug} was taken)`);
        });
      }, STEP_MS);

      // Step 2: add the story to the RSS feed Octopus reads
      setTimeout(() => {
        setState((s) => {
          const item = s.items.find((it) => it.id === id);
          if (!item || item.stage !== "filed" || !item.folderId) return s;
          const entry: FeedEntry = { id: uid("rss"), itemId: id, folderId: item.folderId, publishedAt: new Date().toISOString(), live: true };
          const next = patchItem({ ...s, feed: [entry, ...s.feed.filter((e) => e.itemId !== id)] }, id, (it) => ({ ...it, stage: "published" }));
          return log(next, `Added ${item.draft.slug} to the RSS feed`, "success");
        });
      }, STEP_MS * 2);
    },
    [reviewer]
  );

  const reject = useCallback(
    (id: string, reason: string, note?: string) => {
      const why = note ? `${reason}: ${note}` : reason;
      setState((s) => log(patchItem(s, id, (it) => ({ ...it, stage: "rejected", rejectReason: why, reviewedBy: reviewer })), `Rejected “${s.items.find((i) => i.id === id)?.draft.headline}”: ${why}`, "error"));
    },
    [reviewer]
  );

  const reopen = useCallback((id: string) => {
    setState((s) => log(patchItem(s, id, (it) => ({ ...it, stage: "new", rejectReason: undefined })), `Moved “${s.items.find((i) => i.id === id)?.draft.headline}” back to review`));
  }, []);

  // ─── FTP + feed ────────────────────────────────────────────────────────────
  const renameFolder = useCallback(
    (folderId: string, rawSlug: string, locationCode: string) => {
      const folder = state.folders.find((f) => f.id === folderId);
      if (!folder) return "Folder not found.";
      const error = slugError(rawSlug, locationCode);
      if (error) return error;
      const clash = state.folders.some((f) => f.id !== folderId && f.date === folder.date && f.locationCode === locationCode && f.slug === rawSlug);
      if (clash) return `${rawSlug} already exists in ${locationCode} for ${folder.date}.`;

      setState((s) => {
        const at = new Date().toISOString();
        let next: DeskState = {
          ...s,
          folders: s.folders.map((f) => (f.id === folderId ? { ...f, slug: rawSlug, locationCode, updatedAt: at } : f)),
          feed: s.feed.map((e) => (e.folderId === folderId ? { ...e, updatedAt: at, pulledAt: undefined } : e)),
        };
        next = patchItem(next, folder.itemId, (it) => ({ ...it, draft: { ...it.draft, slug: rawSlug, locationCode, slugEdited: true } }));
        const moved = locationCode !== folder.locationCode;
        const renamed = rawSlug !== folder.slug;
        const what = renamed && moved ? `Renamed ${folder.slug} to ${rawSlug} and moved it to ${locationCode}` : moved ? `Moved ${rawSlug} to ${locationCode}` : `Renamed ${folder.slug} to ${rawSlug}`;
        return log(next, what);
      });
      return null;
    },
    [state.folders]
  );

  const pushFeedUpdate = useCallback((itemId: string) => {
    setState((s) => {
      const at = new Date().toISOString();
      const item = s.items.find((it) => it.id === itemId);
      return log({ ...s, feed: s.feed.map((e) => (e.itemId === itemId ? { ...e, updatedAt: at, pulledAt: undefined, live: true } : e)) }, `Updated ${item?.draft.slug} in the RSS feed`);
    });
  }, []);

  const setFeedLive = useCallback((entryId: string, live: boolean) => {
    setState((s) => {
      const entry = s.feed.find((e) => e.id === entryId);
      const slug = s.folders.find((f) => f.id === entry?.folderId)?.slug;
      return log({ ...s, feed: s.feed.map((e) => (e.id === entryId ? { ...e, live, pulledAt: undefined, updatedAt: new Date().toISOString() } : e)) }, live ? `Put ${slug} back in the RSS feed` : `Took ${slug} out of the RSS feed`);
    });
  }, []);

  const value = useMemo<DeskContextValue>(
    () => ({
      ...state,
      items: shownItems,
      reviewer,
      role,
      access,
      users,
      reporters: [],
      live: false,
      notice: null,
      dismissNotice: () => {},
      setReporter: () => {},
      setUserRole,
      refresh,
      updateDraft,
      resetSlug,
      applyAi,
      cycleAiHeadline,
      approve,
      reject,
      reopen,
      retryDownload,
      renameFolder,
      pushFeedUpdate,
      setFeedLive,
      filters,
      setFilters,
      kindCounts: null,
      districts: [],
      recheckFootage: async () => {},
      setFootage: async () => "The FTP needs the backend.",
      browseFtp: () => Promise.reject(new Error("The FTP needs the backend.")),
    }),
    [state, shownItems, filters, setFilters, reviewer, role, access, users, setUserRole, refresh, updateDraft, resetSlug, applyAi, cycleAiHeadline, approve, reject, reopen, retryDownload, renameFolder, pushFeedUpdate, setFeedLive]
  );

  return <DeskContext.Provider value={value}>{children}</DeskContext.Provider>;
}
