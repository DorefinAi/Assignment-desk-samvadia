"use client";

import { useMemo, useSyncExternalStore } from "react";
import { Access, accessFor, demoAccess, isRole, Role } from "./rbac";

// The signed-in user. With the backend (NEXT_PUBLIC_API_URL set) the session itself is an
// HttpOnly cookie; this keeps the name, role and CSRF token for the UI. Without the backend
// it is the demo session: the role picked at sign-in is trusted as-is.
const KEY = "desk_session";
const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "");
const listeners = new Set<() => void>();

export interface Session {
  username: string;
  role: Role;
  /** Sent as X-CSRF on every change; only with the backend */
  csrf?: string;
  /** Effective permission keys from /me; only with the backend (demo sessions use the role's defaults) */
  permissions?: string[];
  /** Desk routes this person may open, from /me; only with the backend */
  pages?: string[];
  /** Roles this person may hand out, from /me; only with the backend */
  assignableRoles?: Role[];
}

const stringList = (value: unknown): string[] | undefined => (Array.isArray(value) && value.every((v) => typeof v === "string") ? value : undefined);
const roleList = (value: unknown): Role[] | undefined => (Array.isArray(value) ? value.filter(isRole) : undefined);

/** /me's (or the login response's) access fields, or null when any is missing: never guess them from the role */
function accessFields(body: Record<string, unknown> | null): Pick<Session, "permissions" | "pages" | "assignableRoles"> | null {
  const permissions = stringList(body?.permissions);
  const pages = stringList(body?.pages);
  if (!permissions || !pages) return null;
  return { permissions, pages, assignableRoles: roleList(body?.assignable_roles) ?? [] };
}

/** What this session may do. Demo data: the role's defaults. Backend: only what /me said; null until it has
 *  (a session saved before /me sent these), so the desk waits instead of guessing. */
export function accessOf(session: Session): Access | null {
  if (!API_URL) return demoAccess(session.role);
  if (!session.permissions || !session.pages) return null;
  return accessFor(session.role, session.permissions, session.pages, session.assignableRoles ?? []);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function readRaw(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function parse(raw: string | null): Session | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    if (typeof value?.username !== "string" || !isRole(value.role)) return null;
    return {
      username: value.username,
      role: value.role,
      csrf: typeof value.csrf === "string" ? value.csrf : undefined,
      permissions: stringList(value.permissions),
      pages: stringList(value.pages),
      assignableRoles: roleList(value.assignableRoles),
    };
  } catch {
    return null;
  }
}

function store(session: Session) {
  const next = JSON.stringify(session);
  // Same session as stored: no write, so nothing re-renders
  if (readRaw() === next) return;
  localStorage.setItem(KEY, next);
  listeners.forEach((l) => l());
}

export const readSession = () => parse(readRaw());

/** Forget the session in this browser only (the server already ended it, or never had one). */
export function clearSession() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Storage blocked; nothing to clear
  }
  listeners.forEach((l) => l());
}

/** Demo sign-in: no password check, the picked role is used. */
export function signIn(username: string, role: Role) {
  store({ username, role });
}

/** Backend sign-in. Throws with the backend's message ("Wrong username or password.") on failure. */
export async function signInWithApi(apiUrl: string, username: string, password: string) {
  const res = await fetch(`${apiUrl}/auth/login`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(typeof body?.detail === "string" ? body.detail : "Could not sign in. Is the backend running?");
  const role = body?.user?.role;
  // Reporters sign in to the reporter portal, not here
  if (!isRole(role)) throw new Error("This account is not for the assignment desk.");
  // Without the access fields the desk reads /me before showing anything
  store({ username: body.user.username, role, csrf: body.csrf_token, ...accessFields(body) });
}

let meRequest: Promise<boolean> | null = null;

/** Read /me again: what this person may do can change mid-session (owner console, an admin), and the backend
 *  applies it at their next request. Calls made while one is in flight share it. Backend only.
 *  Resolves true when the stored session now has access from /me. */
export function refreshMe(): Promise<boolean> {
  if (!API_URL || !readSession()) return Promise.resolve(false);
  meRequest ??= (async () => {
    try {
      const res = await fetch(`${API_URL}/me`, { credentials: "include" });
      // Signed out in the meantime (here or in another tab): don't bring the session back
      const current = readSession();
      if (!current) return false;
      if (res.status === 401) {
        clearSession();
        return false;
      }
      if (!res.ok) return false; // Backend hiccup: keep what we have
      const body = await res.json().catch(() => null);
      const role = body?.user?.role;
      const username = body?.user?.username;
      // Switched off, or turned into a reporter: this desk is no longer theirs
      if (body?.user?.active === false || !isRole(role)) {
        clearSession();
        return false;
      }
      // Malformed, or an answer for a different login than the one stored now: leave the session alone
      if (typeof username !== "string" || username !== current.username) return false;
      const fields = accessFields(body);
      // Fail closed: without permissions and pages keep what we had (nothing, for an old session)
      if (!fields) return false;
      store({ username, role, csrf: typeof body.csrf_token === "string" ? body.csrf_token : current.csrf, ...fields });
      return true;
    } catch {
      // Network error: keep what we have; the next request tries again
      return false;
    } finally {
      meRequest = null;
    }
  })();
  return meRequest;
}

export function signOut() {
  const session = readSession();
  if (API_URL && session?.csrf) {
    // End the server session too; the page moves on either way
    fetch(`${API_URL}/auth/logout`, { method: "POST", credentials: "include", headers: { "X-CSRF": session.csrf } }).catch(() => undefined);
  }
  clearSession();
}

/** Signed-in user, or null. Always null on the server and during hydration. */
export function useSession() {
  const raw = useSyncExternalStore(subscribe, readRaw, () => null);
  return useMemo(() => parse(raw), [raw]);
}

const noop = () => () => {};

/** False on the server and during hydration, true afterwards. */
export const useHydrated = () => useSyncExternalStore(noop, () => true, () => false);
