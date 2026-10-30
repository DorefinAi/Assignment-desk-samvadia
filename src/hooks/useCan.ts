"use client";

import { can, Permission } from "@/lib/rbac";
import { useDesk } from "@/providers/DeskProvider";

/** True when the signed-in person has the permission (effective permissions, not just the role) */
export function useCan(permission: Permission) {
  return can(useDesk().access, permission);
}
