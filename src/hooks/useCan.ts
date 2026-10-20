"use client";

import { can, Permission } from "@/lib/rbac";
import { useDesk } from "@/providers/DeskProvider";

/** True when the signed-in role has the permission */
export function useCan(permission: Permission) {
  return can(useDesk().role, permission);
}
