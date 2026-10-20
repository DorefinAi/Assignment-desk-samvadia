// Slug and FTP folder rules. The desk names every story folder
// <LOCATION CODE>_<KEYWORDS> (e.g. JPR_METRO_PHASE2) and files it under the
// day and location. Confirm the exact convention with the desk before this
// writes to the real FTP; everything that depends on it goes through here.

import { apiEnabled } from "./api";

export const FTP_ROOT = "/var/ftp/desk";
// The backend's slug is longer (date, city, subject, story type, reporter: 201026_JDH_RAIN_AV_MAHENDRA)
export const SLUG_MAX = apiEnabled ? 96 : 32;

export const LOCATIONS: { code: string; name: string }[] = [
  { code: "JPR", name: "Jaipur" },
  { code: "JDH", name: "Jodhpur" },
  { code: "KOT", name: "Kota" },
  { code: "UDR", name: "Udaipur" },
  { code: "AJM", name: "Ajmer" },
  { code: "BKN", name: "Bikaner" },
  { code: "ALW", name: "Alwar" },
  { code: "BHL", name: "Bhilwara" },
  { code: "SKR", name: "Sikar" },
  { code: "BRT", name: "Bharatpur" },
  { code: "SGN", name: "Sri Ganganagar" },
  { code: "SWM", name: "Sawai Madhopur" },
  { code: "BMR", name: "Barmer" },
  { code: "DEL", name: "Delhi / National" },
];

export const CATEGORIES = ["Politics", "Crime", "Accident", "Courts", "Civic", "Education", "Weather", "Health", "Business", "Agriculture", "Sports", "Entertainment"];

export const locationName = (code: string) => LOCATIONS.find((l) => l.code === code)?.name ?? code;

export const normaliseSlug = (raw: string) =>
  raw
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, SLUG_MAX)
    .replace(/_+$/, "");

export const buildSlug = (locationCode: string, keywords: string[]) => normaliseSlug([locationCode, ...keywords.slice(0, 3)].join("_"));

/** Swaps the location prefix when the story is moved, keeping the rest of the slug. */
export function relocateSlug(slug: string, from: string, to: string) {
  return slug.startsWith(`${from}_`) ? normaliseSlug(`${to}_${slug.slice(from.length + 1)}`) : slug;
}

/** Appends _2, _3... when the folder already exists for that day and location. */
export function uniqueSlug(slug: string, taken: string[]) {
  if (!taken.includes(slug)) return slug;
  let n = 2;
  while (taken.includes(`${slug}_${n}`)) n++;
  return `${slug}_${n}`;
}

export function slugError(slug: string, locationCode: string): string | null {
  if (!slug) return "Slug is required.";
  if (slug !== normaliseSlug(slug)) return "Use capital letters, numbers and underscores only.";
  // The backend builds and checks its own format; the city sits after the date there
  if (apiEnabled) return null;
  if (!slug.startsWith(`${locationCode}_`)) return `Slug must start with the location code ${locationCode}_.`;
  if (slug.length <= locationCode.length + 1) return "Add at least one keyword after the location code.";
  return null;
}

export const dayOf = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const folderPath = (date: string, locationCode: string, slug: string) => `${FTP_ROOT}/${date}/${locationCode}/${slug}/`;

const EXT: Record<string, string> = { video: "mp4", image: "jpg", audio: "opus", document: "pdf" };

/** Files are renamed to the slug when copied into the folder: JPR_METRO_PHASE2_01.mp4 */
export function filedName(slug: string, index: number, originalName: string, kind: string) {
  const ext = originalName.includes(".") ? originalName.split(".").pop()!.toLowerCase() : EXT[kind];
  return `${slug}_${String(index + 1).padStart(2, "0")}.${ext}`;
}
