"use client";

import { useMemo, useSyncExternalStore } from "react";
import { isRole, Role } from "./rbac";

// The signed-in user. With the backend (NEXT_PUBLIC_API_URL set) the session itself is an
// HttpOnly cookie; this keeps the name, role and CSRF token for the UI. Without the backend
// it is the demo session: the role picked at sign-in is trusted as-is.
const KEY = "desk_session";
const listeners = new Set<() => void>();

export interface Session {
  username: string;
  role: Role;
  /** Sent as X-CSRF on every change; only with the backend */
  csrf?: string;
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
    return { username: value.username, role: value.role, csrf: typeof value.csrf === "string" ? value.csrf : undefined };
  } catch {
    return null;
  }
}

function store(session: Session) {
  localStorage.setItem(KEY, JSON.stringify(session));
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
  store({ username: body.user.username, role, csrf: body.csrf_token });
}

export function signOut() {
  const session = readSession();
  const apiUrl = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "");
  if (apiUrl && session?.csrf) {
    // End the server session too; the page moves on either way
    fetch(`${apiUrl}/auth/logout`, { method: "POST", credentials: "include", headers: { "X-CSRF": session.csrf } }).catch(() => undefined);
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
