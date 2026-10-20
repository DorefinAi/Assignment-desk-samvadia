"use client";

// Talks to the Vartmaan backend. With NEXT_PUBLIC_API_URL unset the desk runs on its demo data,
// as before; set it (e.g. http://localhost:8000 for `python -m app.devstack`) to use the real API.
import { clearSession, readSession } from "./auth";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "");
export const apiEnabled = API_URL !== "";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

/** The backend's error text ("detail"), or a plain fallback. */
export async function errorMessage(res: Response): Promise<string> {
  const body = await res.json().catch(() => null);
  const detail = body?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return String(detail[0].msg);
  return `Request failed (${res.status}).`;
}

/** JSON request with the session cookie, and the CSRF header on anything that changes data. */
export async function api<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const method = options.method ?? "GET";
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  const csrf = readSession()?.csrf;
  if (method !== "GET" && csrf) headers["X-CSRF"] = csrf;

  const res = await fetch(API_URL + path, { method, credentials: "include", headers, body: options.body === undefined ? undefined : JSON.stringify(options.body) });
  if (!res.ok) {
    // The session ended on the server (expired or logged out elsewhere): back to the sign-in page
    if (res.status === 401) clearSession();
    throw new ApiError(res.status, await errorMessage(res));
  }
  return res.json() as Promise<T>;
}
