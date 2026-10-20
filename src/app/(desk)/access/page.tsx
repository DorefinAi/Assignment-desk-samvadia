"use client";

import React from "react";
import { Box, MenuItem, TextField, Typography } from "@mui/material";
import { Check, Minus } from "lucide-react";
import { useDesk } from "@/providers/DeskProvider";
import { assignableRoles, canManageUser, Permission, PERMISSIONS, Role, ROLE_META, ROLES } from "@/lib/rbac";
import { Panel } from "@/components/common/shared";

const PERMISSION_KEYS = Object.keys(PERMISSIONS) as Permission[];

export default function AccessPage() {
  const { users, role, reviewer, setUserRole } = useDesk();
  const options = assignableRoles(role);

  return (
    <Box sx={{ px: { xs: 2, md: 3 }, py: 2.5, maxWidth: 1280, mx: "auto", display: "grid", gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 0.9fr) minmax(0, 1.1fr)" }, gap: 2, alignItems: "start" }}>
      <Panel title="People" hint={role === "super_admin" ? "You can give anyone any role." : "You can change roles for people below admin."}>
        {users.map((user, i) => {
          const editable = canManageUser(role, user.role);
          const isYou = user.username === reviewer;
          return (
            <Box key={user.id} sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2, py: 1.25, borderTop: i ? "1px solid" : "none", borderColor: "divider" }}>
              <Box sx={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, display: "grid", placeItems: "center", backgroundColor: "action.hover", fontSize: "0.8125rem", fontWeight: 700 }}>{user.name.slice(0, 1)}</Box>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography sx={{ fontSize: "0.8125rem", fontWeight: 600 }}>
                  {user.name}
                  {isYou && (
                    <Box component="span" sx={{ color: "text.secondary", fontWeight: 400 }}>
                      {" "}
                      (you)
                    </Box>
                  )}
                </Typography>
                <Typography sx={{ fontSize: "0.6875rem", color: "text.secondary" }}>@{user.username}</Typography>
              </Box>
              {editable && !isYou ? (
                <TextField
                  select
                  size="small"
                  value={user.role}
                  onChange={(e) => setUserRole(user.id, e.target.value as Role)}
                  slotProps={{ htmlInput: { "aria-label": `Role for ${user.name}` } }}
                  sx={{ width: { xs: 150, sm: 180 }, flexShrink: 0 }}
                >
                  {options.map((r) => (
                    <MenuItem key={r} value={r}>
                      {ROLE_META[r].label}
                    </MenuItem>
                  ))}
                </TextField>
              ) : (
                <Typography sx={{ fontSize: "0.75rem", fontWeight: 600, color: "text.secondary", flexShrink: 0 }}>{ROLE_META[user.role].label}</Typography>
              )}
            </Box>
          );
        })}
      </Panel>

      <Panel title="What each role can do" hint="Roles go from most access (left) to least. Your role is highlighted.">
        <Box sx={{ overflowX: "auto" }}>
          <Box component="table" sx={{ width: "100%", minWidth: 520, borderCollapse: "collapse", fontSize: "0.75rem", "& th, & td": { px: 1.5, py: 1, borderTop: "1px solid", borderColor: "divider", textAlign: "center" }, "& th:first-of-type, & td:first-of-type": { textAlign: "left" } }}>
            <thead>
              <tr>
                <Box component="th" scope="col" sx={{ fontWeight: 600, color: "text.secondary", borderTop: "none !important" }}>
                  Feature
                </Box>
                {ROLES.map((r) => (
                  <Box component="th" scope="col" key={r} sx={{ fontWeight: 700, borderTop: "none !important", whiteSpace: "nowrap", backgroundColor: r === role ? "action.selected" : undefined }}>
                    {ROLE_META[r].label}
                  </Box>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSION_KEYS.map((key) => (
                <tr key={key}>
                  <Box component="td" sx={{ color: "text.primary" }}>
                    {PERMISSIONS[key].label}
                  </Box>
                  {ROLES.map((r) => {
                    const allowed = PERMISSIONS[key].roles.includes(r);
                    return (
                      <Box component="td" key={r} sx={{ backgroundColor: r === role ? "action.selected" : undefined, color: allowed ? "success.main" : "text.secondary" }}>
                        <Box component="span" sx={{ display: "inline-flex" }} aria-label={allowed ? "Yes" : "No"}>
                          {allowed ? <Check size={15} strokeWidth={2.5} /> : <Minus size={15} />}
                        </Box>
                      </Box>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </Box>
        </Box>
        <Box sx={{ px: 2, py: 1.5, borderTop: "1px solid", borderColor: "divider", display: "flex", flexDirection: "column", gap: 0.5 }}>
          {ROLES.map((r) => (
            <Typography key={r} sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
              <Box component="span" sx={{ fontWeight: 700, color: "text.primary" }}>
                {ROLE_META[r].label}:
              </Box>{" "}
              {ROLE_META[r].description}
            </Typography>
          ))}
        </Box>
      </Panel>
    </Box>
  );
}
