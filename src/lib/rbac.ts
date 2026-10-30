// Who can see and do what. Roles are listed from most to least access.
// This only hides things in the UI; the backend checks the same rules on every request.
//
// With the backend, what a person may do comes from /me (and the login response): `permissions` (their effective
// keys: role defaults plus any per-person override from the owner console) and `pages` (desk routes they may open).
// Without the backend (demo data) both are worked out from the role, using the same defaults as the backend.
// The rules below mirror the backend's require(permission, pages) checks, so the UI never offers what it would refuse.

export type Role = "super_admin" | "admin" | "assignment_desk" | "chief_editor";

export const ROLES: Role[] = ["super_admin", "admin", "assignment_desk", "chief_editor"];

export const ROLE_META: Record<Role, { label: string; description: string }> = {
  super_admin: { label: "Super admin", description: "Everything, including the raw feed and connection settings." },
  admin: { label: "Admin", description: "Runs the desk: users, FTP folders, the RSS feed and every intake action." },
  assignment_desk: { label: "Assignment desk", description: "Reviews and approves stories into Octopus." },
  chief_editor: { label: "Chief editor", description: "Sees the overview and intake. Cannot change anything." },
};

const EVERYONE = ROLES;
const DESK_AND_UP: Role[] = ["super_admin", "admin", "assignment_desk"];
const ADMINS: Role[] = ["super_admin", "admin"];
const SUPER_ONLY: Role[] = ["super_admin"];

/** The backend's permission keys and their role defaults (backend-Samvadia app/security.py CATALOGUE). */
export type ApiPermission =
  | "page.dashboard"
  | "page.inbox"
  | "page.feed"
  | "page.ftp"
  | "page.reporters"
  | "page.access"
  | "desk.view"
  | "desk.review"
  | "desk.fetch"
  | "reporters.manage"
  | "feed.view"
  | "feed.manage"
  | "ftp.manage"
  | "users.manage";

const ROLE_DEFAULTS: Record<ApiPermission, Role[]> = {
  "page.dashboard": EVERYONE,
  "page.inbox": EVERYONE,
  "page.feed": ADMINS,
  "page.ftp": ADMINS,
  "page.reporters": DESK_AND_UP,
  "page.access": ADMINS,
  "desk.view": EVERYONE,
  "desk.review": DESK_AND_UP,
  "desk.fetch": DESK_AND_UP,
  "reporters.manage": ADMINS,
  "feed.view": ADMINS,
  "feed.manage": ADMINS,
  "ftp.manage": ADMINS,
  "users.manage": ADMINS,
};

/** Desk pages in nav order, with the page key that opens each one. Every page but /access reads desk data,
 *  which the backend refuses without desk.view, so those pages need it too. */
export const DESK_PAGES: { path: string; label: string; key: ApiPermission; deskData: boolean }[] = [
  { path: "/dashboard", label: "Overview", key: "page.dashboard", deskData: true },
  { path: "/inbox", label: "Intake", key: "page.inbox", deskData: true },
  { path: "/ftp", label: "FTP folders", key: "page.ftp", deskData: true },
  { path: "/feed", label: "RSS feed", key: "page.feed", deskData: true },
  { path: "/reporters", label: "Reporters", key: "page.reporters", deskData: true },
  { path: "/access", label: "Users and roles", key: "page.access", deskData: false },
];

/** Pages built from the story list (GET /desk/items); the backend refuses that list to anyone with none of them */
const STORY_PAGES = ["/dashboard", "/inbox", "/feed", "/ftp"];

/** What the signed-in person may do */
export interface Access {
  role: Role;
  permissions: ReadonlySet<string>;
  /** Desk routes they may open, in nav order */
  pages: string[];
  /** Roles they may hand out on the access page (the backend's assignable_roles) */
  assignable: Role[];
}

/** The role's default keys (demo data only; with the backend, /me decides) */
const roleDefaults = (role: Role): string[] => (Object.keys(ROLE_DEFAULTS) as ApiPermission[]).filter((k) => ROLE_DEFAULTS[k].includes(role));

/** Access from /me's permissions, pages and assignable roles. */
export function accessFor(role: Role, permissions: string[], pages: string[], assignable: Role[]): Access {
  const keys = new Set<string>(permissions);
  // In nav order whatever order the backend lists them in; a page reading desk data also needs desk.view
  const open = DESK_PAGES.filter((p) => pages.includes(p.path) && (!p.deskData || keys.has("desk.view"))).map((p) => p.path);
  return { role, permissions: keys, pages: open, assignable };
}

/** Demo data (no backend): everything from the role, with the backend's defaults */
export function demoAccess(role: Role): Access {
  const keys = roleDefaults(role);
  return accessFor(role, keys, DESK_PAGES.filter((p) => keys.includes(p.key)).map((p) => p.path), assignableRoles(role));
}

/** What the desk UI checks. `needs` are backend keys (all required); `roleGate` is for the few
 *  display-only extras the backend has no key for, so they still follow the role. */
export type Permission =
  | "dashboard.view"
  | "dashboard.connections"
  | "dashboard.activity"
  | "intake.view"
  | "intake.fetch"
  | "intake.review"
  | "intake.footage"
  | "ftp.view"
  | "ftp.rename"
  | "feed.view"
  | "feed.manage"
  | "feed.xml"
  | "reporters.view"
  | "reporters.manage"
  | "access.view"
  | "access.manage";

const RULES: Record<Permission, { label: string; needs: ApiPermission[]; roleGate?: Role[] }> = {
  "dashboard.view": { label: "See the overview", needs: ["page.dashboard", "desk.view"] },
  "dashboard.connections": { label: "See connection details", needs: ["page.dashboard", "desk.view"], roleGate: SUPER_ONLY },
  // GET /desk/activity: desk.view + page.dashboard; the admin-only part has no backend key yet
  "dashboard.activity": { label: "See the activity log", needs: ["page.dashboard", "desk.view"], roleGate: ADMINS },
  "intake.view": { label: "See intake messages", needs: ["page.inbox", "desk.view"] },
  // POST /desk/refresh. The refresh button (shell/RefreshButton) checks it but is not placed on any page yet
  "intake.fetch": { label: "Refresh WhatsApp, Outlook and Octopus", needs: ["desk.fetch"] },
  "intake.review": { label: "Edit, approve and reject stories", needs: ["desk.review"] },
  // GET /desk/ftp/browse: desk.review + page.inbox
  "intake.footage": { label: "Pick a story's footage folder on FTP", needs: ["desk.review", "page.inbox"] },
  // FTP and the RSS feed are admin-only by default: the desk approves, admins see where it went
  "ftp.view": { label: "See FTP folders", needs: ["page.ftp", "desk.view"] },
  // A rename is a story edit (desk.review) on the backend; ftp.manage keeps it to FTP managers, as before
  "ftp.rename": { label: "Rename or move FTP folders", needs: ["ftp.manage", "desk.review"] },
  // GET /desk/stories: feed.view + page.feed
  "feed.view": { label: "See the RSS feed", needs: ["page.feed", "desk.view", "feed.view"] },
  "feed.manage": { label: "Take entries out of the feed, send updates", needs: ["feed.manage"] },
  "feed.xml": { label: "See and copy the raw feed XML", needs: ["page.feed", "desk.view"], roleGate: SUPER_ONLY },
  "reporters.view": { label: "See the reporter list", needs: ["page.reporters", "desk.view"] },
  "reporters.manage": { label: "Add and edit reporters", needs: ["reporters.manage"] },
  "access.view": { label: "See users and roles", needs: ["page.access"] },
  // GET /admin/users: users.manage + page.access
  "access.manage": { label: "Change users' roles", needs: ["users.manage"] },
};

export const can = (access: Access, permission: Permission) => {
  const rule = RULES[permission];
  return rule.needs.every((k) => access.permissions.has(k)) && (!rule.roleGate || rule.roleGate.includes(access.role));
};

/** The desk page a path belongs to: "/inbox", "/inbox/" and "/inbox/123" are all the inbox */
const pageOf = (path: string) => {
  const clean = path.replace(/\/+$/, "") || "/";
  return DESK_PAGES.find((p) => clean === p.path || clean.startsWith(`${p.path}/`));
};

/** True for a desk page (or anything under it) this person may open; other paths are not guarded. */
export const canOpen = (access: Access, path: string) => {
  const page = pageOf(path);
  return !page || access.pages.includes(page.path);
};

/** The page to send someone to when they land somewhere they can't open */
export const homePage = (access: Access) => access.pages[0] ?? null;

export const pageLabel = (path: string) => pageOf(path)?.label ?? "This page";

/** GET /desk/items: desk.view and one of the pages built from it. False for a /reporters- or /access-only login. */
export const canLoadStories = (access: Access) => access.permissions.has("desk.view") && access.pages.some((p) => STORY_PAGES.includes(p));

/** Lower number = more access */
export const rank = (role: Role) => ROLES.indexOf(role);

/** Roles a user may hand out: only roles below their own, except a super admin, who can give any role. */
export const assignableRoles = (role: Role) => (role === "super_admin" ? ROLES : ROLES.filter((r) => rank(r) > rank(role)));

/** Someone who may manage users can change people below them; a super admin can change anyone. */
export const canManageUser = (access: Access, target: Role) => can(access, "access.manage") && (access.role === "super_admin" || rank(target) > rank(access.role));

export const isRole = (value: unknown): value is Role => typeof value === "string" && (ROLES as string[]).includes(value);

/** What each role gets by default, for the table on the access page */
export const PERMISSIONS: Record<Permission, { label: string; roles: Role[] }> = Object.fromEntries(
  (Object.keys(RULES) as Permission[]).map((key) => [key, { label: RULES[key].label, roles: ROLES.filter((r) => can(demoAccess(r), key)) }])
) as Record<Permission, { label: string; roles: Role[] }>;
