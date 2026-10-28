"use client";

// The desk on the real backend. Same context as the demo provider, so every screen works unchanged.
//   load:      GET /desk/items?full=true, again whenever the backend's live events say something moved
//   edits:     typed changes are kept here and sent as one PATCH a moment after typing stops
//   decisions: any unsent edit goes first, then approve / reject / reopen
import React, { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_FILTERS, District, FeedEntry, FetchRun, FtpFolder, FtpListing, InboxFilters, IntakeItem, KindCounts, StoryDraft } from "@/types/desk";
import { api, API_URL, ApiError } from "@/lib/api";
import { ApiDistrict, ApiItem, ApiItemList, ApiReporter, itemOf, rejectBody, toDistrict, toFtpListing, toIntakeItem, toKindCounts } from "@/lib/apiItems";
import { matchesFilters, rangeWindow, toIstIso } from "@/lib/ist";
import { dayOf } from "@/lib/slug";
import { can, isRole, Role } from "@/lib/rbac";
import { DeskUser } from "@/data/users";
import { DeskContext, DeskContextValue, ReporterOption } from "./deskContext";

const SAVE_AFTER_MS = 700;
/** Backend event names that mean "an item changed"; any of them reloads the list */
const EVENT_TYPES = ["item.created", "item.updated", "media.in_storage", "media.on_ftp", "media.failed", "story.ready", "fetch.run"];

type DraftField = keyof StoryDraft;
/** The desk's draft fields, as the backend's PATCH fields */
const PATCH_FIELD: Partial<Record<DraftField, string>> = { headline: "headline", body: "body", category: "category", priority: "priority", locationCode: "city_code", slug: "slug" };

/** GET /desk/items query for the inbox filters (contract section 2). An older backend ignores the new parameters. */
function itemsQuery(filters: InboxFilters): string {
  const q = new URLSearchParams({ full: "true", limit: "200", kind: filters.kind });
  const { from, to } = rangeWindow(filters);
  if (from !== null) q.set("from", toIstIso(from));
  if (to !== null) q.set("to", toIstIso(to));
  if (filters.district) q.set("district", filters.district);
  return q.toString();
}

interface Pending {
  patch: Partial<StoryDraft>;
  timer: ReturnType<typeof setTimeout> | null;
}

export default function ApiDeskProvider({ reviewer, role, children }: { reviewer: string; role: Role; children: ReactNode }) {
  const [items, setItems] = useState<IntakeItem[]>([]);
  const [raw, setRaw] = useState<Record<string, ApiItem>>({});
  const [reporters, setReporters] = useState<ReporterOption[]>([]);
  const [runs, setRuns] = useState<FetchRun[]>([]);
  const [users, setUsers] = useState<DeskUser[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [filters, setFilterState] = useState<InboxFilters>(DEFAULT_FILTERS);
  const [kindCounts, setKindCounts] = useState<KindCounts | null>(null);
  const [districts, setDistricts] = useState<District[]>([]);
  const filtersRef = useRef(filters);
  /** Only the newest list request may land, so a slow answer for an old filter can't overwrite a new one */
  const loadSeq = useRef(0);
  const versions = useRef(new Map<string, number>());
  const pending = useRef(new Map<string, Pending>());

  const fail = useCallback((err: unknown) => setNotice(err instanceof Error ? err.message : "Something went wrong. Try again."), []);

  /** Server copy in; any field still being typed keeps the local value. */
  const withLocalEdits = (next: IntakeItem): IntakeItem => {
    const local = pending.current.get(next.id)?.patch;
    return local ? { ...next, draft: { ...next.draft, ...local } } : next;
  };

  const merge = useCallback((item: ApiItem) => {
    versions.current.set(item.id, item.version);
    setRaw((r) => ({ ...r, [item.id]: item }));
    setItems((list) => {
      const next = withLocalEdits(toIntakeItem(item));
      return list.some((i) => i.id === item.id) ? list.map((i) => (i.id === item.id ? next : i)) : [next, ...list];
    });
  }, []);

  const load = useCallback(async () => {
    const current = filtersRef.current;
    const seq = ++loadSeq.current;
    const res = await api<ApiItemList>(`/desk/items?${itemsQuery(current)}`);
    if (seq !== loadSeq.current) return;
    const counts = toKindCounts(res.kind_counts);
    setKindCounts(counts);
    // An older backend ignores from/to; apply them here too so the time filter still works
    const rows = counts ? res.items : res.items.filter((r) => matchesFilters({ receivedAt: r.received_at }, current));
    rows.forEach((r) => versions.current.set(r.id, r.version));
    setRaw(Object.fromEntries(rows.map((r) => [r.id, r])));
    setItems(rows.map((r) => withLocalEdits(toIntakeItem(r))));
  }, []);

  /** Reporters for the picker, the fetch history and (admins) the user list. Each may fail on its own. */
  const loadLists = useCallback(async () => {
    const [rep, fetched, people, dist] = await Promise.allSettled([
      api<{ reporters: ApiReporter[] }>("/desk/reporters"),
      api<{ runs: { id: number; source: FetchRun["source"]; added: number; titles: string[]; at: string }[] }>("/desk/fetch-runs"),
      can(role, "access.manage") ? api<{ users: { id: string; name: string; username: string; role: string }[] }>("/admin/users") : Promise.reject(),
      api<{ districts: ApiDistrict[] }>("/desk/districts"),
    ]);
    if (dist.status === "fulfilled" && Array.isArray(dist.value?.districts)) setDistricts(dist.value.districts.map(toDistrict).filter((d): d is District => d !== null));
    if (rep.status === "fulfilled") setReporters(rep.value.reporters.map((r) => ({ id: r.id, name: r.name, cityCode: r.city_code, slugCode: r.slug_code })));
    if (fetched.status === "fulfilled") setRuns(fetched.value.runs.map((r) => ({ ...r, id: String(r.id) })));
    if (people.status === "fulfilled") setUsers(people.value.users.filter((u) => isRole(u.role)).map((u) => ({ id: u.id, name: u.name, username: u.username, role: u.role as Role })));
  }, [role]);

  // First load, the side lists, and live updates from the backend
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- state is set when the requests return, not during the effect
    loadLists().catch(fail);

    let timer: ReturnType<typeof setTimeout> | undefined;
    const reload = () => {
      clearTimeout(timer);
      timer = setTimeout(() => load().catch(() => undefined), 400);
    };
    const events = new EventSource(`${API_URL}/events?app=desk`, { withCredentials: true });
    EVENT_TYPES.forEach((type) => events.addEventListener(type, reload));
    // Belt and braces: a reload every half minute in case the event stream drops
    const poll = setInterval(reload, 30000);
    return () => {
      events.close();
      clearInterval(poll);
      clearTimeout(timer);
    };
  }, [load, loadLists, fail]);

  // The list itself: first load, and again whenever a filter changes
  useEffect(() => {
    filtersRef.current = filters;
    load().catch(fail);
  }, [filters, load, fail]);

  const setFilters = useCallback((patch: Partial<InboxFilters>) => setFilterState((f) => ({ ...f, ...patch })), []);

  // ─── Editing ───────────────────────────────────────────────────────────────
  const save = useCallback(
    async (id: string) => {
      const entry = pending.current.get(id);
      if (!entry) return;
      if (entry.timer) clearTimeout(entry.timer);
      pending.current.delete(id);
      const body: Record<string, unknown> = { version: versions.current.get(id) };
      for (const [field, value] of Object.entries(entry.patch)) {
        const name = PATCH_FIELD[field as DraftField];
        if (name) body[name] = value;
      }
      try {
        const res = await api<{ item: ApiItem }>(`/desk/items/${id}`, { method: "PATCH", body });
        merge(res.item);
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          setNotice("Someone else changed this story at the same time. It has been reloaded; check your edit.");
          api<{ item: ApiItem }>(`/desk/items/${id}`).then((r) => merge(r.item)).catch(() => undefined);
        } else fail(err);
      }
    },
    [merge, fail]
  );

  /** Send any unsaved edit for this story now. Decisions call it first so nothing typed is lost. */
  const flush = useCallback((id: string) => save(id), [save]);

  const updateDraft = useCallback(
    (id: string, patch: Partial<StoryDraft>) => {
      setItems((list) => list.map((it) => (it.id === id ? { ...it, draft: { ...it.draft, ...patch, ...(patch.slug !== undefined ? { slugEdited: true } : {}) } } : it)));
      const entry = pending.current.get(id) ?? { patch: {}, timer: null };
      entry.patch = { ...entry.patch, ...patch };
      if (entry.timer) clearTimeout(entry.timer);
      entry.timer = setTimeout(() => save(id), SAVE_AFTER_MS);
      pending.current.set(id, entry);
    },
    [save]
  );

  /** Run a backend action on one story and take the story it returns. */
  const act = useCallback(
    async (id: string, path: string, body?: unknown) => {
      try {
        await flush(id);
        const res = await api<{ item: ApiItem }>(path, { method: "POST", body });
        if (res.item?.media) merge(res.item);
        else await load();
      } catch (err) {
        fail(err);
        load().catch(() => undefined);
      }
    },
    [flush, merge, load, fail]
  );

  const resetSlug = useCallback((id: string) => void act(id, `/desk/items/${id}/slug/reset`), [act]);
  const approve = useCallback((id: string) => void act(id, `/desk/items/${id}/approve`), [act]);
  const reject = useCallback((id: string, reason: string, note?: string) => void act(id, `/desk/items/${id}/reject`, rejectBody(reason, note)), [act]);
  const reopen = useCallback((id: string) => void act(id, `/desk/items/${id}/reopen`), [act]);
  const retryDownload = useCallback((itemId: string, mediaId: string) => void act(itemId, `/desk/media/${mediaId}/retry`), [act]);
  const pushFeedUpdate = useCallback((itemId: string) => void act(itemId, `/desk/items/${itemId}/publish-update`), [act]);

  /** Unknown sender: the desk picks the reporter, and the backend builds the slug. */
  const setReporter = useCallback(
    async (id: string, reporterId: string) => {
      try {
        await flush(id);
        const res = await api<{ item: ApiItem }>(`/desk/items/${id}`, { method: "PATCH", body: { version: versions.current.get(id), reporter_id: reporterId } });
        merge(res.item);
      } catch (err) {
        fail(err);
      }
    },
    [flush, merge, fail]
  );

  const renameFolder = useCallback(
    (folderId: string, slug: string, locationCode: string) => {
      // A folder here is its item (the backend renames the folder on FTP)
      updateDraft(folderId, { slug, locationCode });
      return null;
    },
    [updateDraft]
  );

  const setFeedLive = useCallback(
    (entryId: string, live: boolean) => {
      if (live) {
        setNotice("A withdrawn story can't go back into the feed. Send it again as a new story.");
        return;
      }
      void act(entryId, `/desk/items/${entryId}/kill`);
    },
    [act]
  );

  const setUserRole = useCallback(
    (userId: string, next: Role) => {
      api(`/admin/users/${userId}`, { method: "PATCH", body: { role: next } })
        .then(() => setUsers((list) => list.map((u) => (u.id === userId ? { ...u, role: next } : u))))
        .catch(fail);
    },
    [fail]
  );

  // ─── Footage (build 1) ─────────────────────────────────────────────────────
  const recheckFootage = useCallback(
    async (id: string) => {
      try {
        const res = await api<ApiItem | { item: ApiItem }>(`/desk/items/${id}/footage/recheck`, { method: "POST" });
        merge(itemOf(res));
      } catch (err) {
        fail(err);
      }
    },
    [merge, fail]
  );

  const setFootage = useCallback(
    async (id: string, path: string | null): Promise<string | null> => {
      try {
        await flush(id);
        const res = await api<ApiItem | { item: ApiItem }>(`/desk/items/${id}/footage`, { method: "PUT", body: { path, version: versions.current.get(id) } });
        merge(itemOf(res));
        return null;
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          // Stale version: take the server's copy so the next try carries the new version
          await api<{ item: ApiItem }>(`/desk/items/${id}`).then((r) => merge(r.item)).catch(() => undefined);
          return "This story changed while you were picking. It has been reloaded; choose the folder again.";
        }
        return err instanceof Error ? err.message : "Could not save the folder. Try again.";
      }
    },
    [flush, merge]
  );

  const browseFtp = useCallback(async (path: string): Promise<FtpListing> => {
    const raw = await api<Parameters<typeof toFtpListing>[0]>(`/desk/ftp/browse?${new URLSearchParams({ path })}`);
    return toFtpListing(raw);
  }, []);

  const refresh = useCallback(() => {
    api("/desk/refresh", { method: "POST" })
      .then(() => load())
      .catch(fail);
    return { whatsapp: 0, outlook: 0, octopus: 0 };
  }, [load, fail]);

  // Folders and feed entries, as the FTP and RSS pages expect them, from the items themselves
  const folders = useMemo<FtpFolder[]>(
    () =>
      items
        .filter((i) => i.folderId)
        .map((i) => ({
          id: i.id,
          itemId: i.id,
          slug: i.draft.slug,
          locationCode: i.draft.locationCode,
          date: dayOf(i.receivedAt),
          attachmentIds: (raw[i.id]?.media ?? []).filter((m) => m.state === "on_ftp").map((m) => m.id),
          createdAt: i.receivedAt,
        })),
    [items, raw]
  );
  const feed = useMemo<FeedEntry[]>(() => items.filter((i) => i.stage === "published").map((i) => ({ id: i.id, itemId: i.id, folderId: i.id, publishedAt: i.receivedAt, live: true })), [items]);

  const value = useMemo<DeskContextValue>(
    () => ({
      items,
      folders,
      feed,
      runs,
      activity: [],
      reviewer,
      role,
      users,
      reporters,
      live: true,
      notice,
      dismissNotice: () => setNotice(null),
      setUserRole,
      refresh,
      updateDraft,
      resetSlug,
      setReporter: (id, reporterId) => void setReporter(id, reporterId),
      // No AI model behind the backend yet; the sparkles stay hidden
      applyAi: () => {},
      cycleAiHeadline: () => {},
      approve,
      reject,
      reopen,
      retryDownload,
      renameFolder,
      pushFeedUpdate,
      setFeedLive,
      filters,
      setFilters,
      kindCounts,
      districts,
      recheckFootage,
      setFootage,
      browseFtp,
    }),
    [items, folders, feed, runs, reviewer, role, users, reporters, notice, setUserRole, refresh, updateDraft, resetSlug, setReporter, approve, reject, reopen, retryDownload, renameFolder, pushFeedUpdate, setFeedLive, filters, setFilters, kindCounts, districts, recheckFootage, setFootage, browseFtp]
  );

  return <DeskContext.Provider value={value}>{children}</DeskContext.Provider>;
}
