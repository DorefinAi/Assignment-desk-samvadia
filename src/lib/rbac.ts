// Who can see and do what. Roles are listed from most to least access.
// This only hides things in the UI; the real API must check the same rules.

export type Role = "super_admin" | "admin" | "assignment_desk" | "chief_editor";

export const ROLES: Role[] = ["super_admin", "admin", "assignment_desk", "chief_editor"];

export const ROLE_META: Record<Role, { label: string; description: string }> = {
  super_admin: { label: "Super admin", description: "Everything, including the raw feed and connection settings." },
  admin: { label: "Admin", description: "Runs the desk: users, FTP folders, the RSS feed and every intake action." },
  assignment_desk: { label: "Assignment desk", description: "Reviews and approves stories into Octopus." },
  chief_editor: { label: "Chief editor", description: "Sees the overview and intake. Cannot change anything." },
};

export type Permission =
  | "dashboard.view"
  | "dashboard.connections"
  | "dashboard.activity"
  | "intake.view"
  | "intake.fetch"
  | "intake.review"
  | "ftp.view"
  | "ftp.rename"
  | "feed.view"
  | "feed.manage"
  | "feed.xml"
  | "reporters.view"
  | "reporters.manage"
  | "access.view"
  | "access.manage";

const EVERYONE = ROLES;
const DESK_AND_UP: Role[] = ["super_admin", "admin", "assignment_desk"];
const ADMINS: Role[] = ["super_admin", "admin"];
const SUPER_ONLY: Role[] = ["super_admin"];

export const PERMISSIONS: Record<Permission, { label: string; roles: Role[] }> = {
  "dashboard.view": { label: "See the overview", roles: EVERYONE },
  "dashboard.connections": { label: "See connection details", roles: SUPER_ONLY },
  "dashboard.activity": { label: "See the activity log", roles: ADMINS },
  "intake.view": { label: "See intake messages", roles: EVERYONE },
  "intake.fetch": { label: "Refresh WhatsApp, Outlook and Octopus", roles: DESK_AND_UP },
  "intake.review": { label: "Edit, approve and reject stories", roles: DESK_AND_UP },
  // FTP and the RSS feed are admin-only: the desk approves, admins see where it went
  "ftp.view": { label: "See FTP folders", roles: ADMINS },
  "ftp.rename": { label: "Rename or move FTP folders", roles: ADMINS },
  "feed.view": { label: "See the RSS feed", roles: ADMINS },
  "feed.manage": { label: "Take entries out of the feed, send updates", roles: ADMINS },
  "feed.xml": { label: "See and copy the raw feed XML", roles: SUPER_ONLY },
  "reporters.view": { label: "See the reporter list", roles: DESK_AND_UP },
  // Matches the backend's reporters.manage
  "reporters.manage": { label: "Add and edit reporters", roles: ADMINS },
  "access.view": { label: "See users and roles", roles: ADMINS },
  "access.manage": { label: "Change users' roles", roles: ADMINS },
};

export const can = (role: Role, permission: Permission) => PERMISSIONS[permission].roles.includes(role);

/** Permission needed to open each page */
export const ROUTE_PERMISSION: Record<string, Permission> = {
  "/dashboard": "dashboard.view",
  "/inbox": "intake.view",
  "/ftp": "ftp.view",
  "/feed": "feed.view",
  "/reporters": "reporters.view",
  "/access": "access.view",
};

/** Lower number = more access */
export const rank = (role: Role) => ROLES.indexOf(role);

/** Roles a user may hand out: only roles below their own, except a super admin, who can give any role. */
export const assignableRoles = (role: Role) => (role === "super_admin" ? ROLES : ROLES.filter((r) => rank(r) > rank(role)));

/** Admins can change people below them; a super admin can change anyone. */
export const canManageUser = (role: Role, target: Role) => can(role, "access.manage") && (role === "super_admin" || rank(target) > rank(role));

export const isRole = (value: unknown): value is Role => typeof value === "string" && (ROLES as string[]).includes(value);
