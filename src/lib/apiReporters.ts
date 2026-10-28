"use client";

// The reporter list (contract section 3, #10). The backend already had GET/POST /desk/reporters and
// PUT /desk/reporters/{id} (one email, city_code); build 1 extends them with district_code and emails[].
// Requests carry both shapes so either backend accepts them.
import { api, ApiError } from "./api";
import { ApiReporter } from "./apiItems";

export interface Reporter {
  id: string;
  name: string;
  slugCode: string;
  districtCode: string;
  emails: string[];
  phone: string;
  active: boolean;
}

export type ReporterInput = Omit<Reporter, "id">;

export function toReporter(r: ApiReporter): Reporter {
  const emails = Array.isArray(r.emails) ? r.emails.filter(Boolean) : r.email ? [r.email] : [];
  return { id: r.id, name: r.name, slugCode: r.slug_code, districtCode: r.district_code ?? r.city_code ?? "", emails, phone: r.phone ?? "", active: r.active ?? true };
}

function body(r: ReporterInput, districtName: string | null) {
  const code = r.districtCode.trim().toUpperCase();
  return {
    name: r.name.trim(),
    slug_code: r.slugCode.trim().toUpperCase(),
    district_code: code || null,
    emails: r.emails,
    phone: r.phone.trim() || null,
    active: r.active,
    // Older backend fields
    city_code: code,
    district: districtName,
    email: r.emails[0] ?? null,
  };
}

/** Everyone, inactive too. `all=true` asks for inactive reporters; an older backend ignores it and lists active ones. */
export async function listReporters(): Promise<Reporter[]> {
  const res = await api<{ reporters: ApiReporter[] }>("/desk/reporters?all=true&limit=1000");
  return res.reporters.map(toReporter);
}

export async function addReporter(r: ReporterInput, districtName: string | null): Promise<Reporter> {
  const res = await api<{ reporter: ApiReporter }>("/desk/reporters", { method: "POST", body: body(r, districtName) });
  return toReporter(res.reporter);
}

/** PUT, as the existing backend has it; PATCH (the contract's fallback name) if PUT isn't there */
export async function saveReporter(id: string, r: ReporterInput, districtName: string | null): Promise<Reporter> {
  const payload = body(r, districtName);
  try {
    const res = await api<{ reporter: ApiReporter }>(`/desk/reporters/${id}`, { method: "PUT", body: payload });
    return toReporter(res.reporter);
  } catch (err) {
    if (!(err instanceof ApiError && err.status === 405)) throw err;
    const res = await api<{ reporter: ApiReporter }>(`/desk/reporters/${id}`, { method: "PATCH", body: payload });
    return toReporter(res.reporter);
  }
}
