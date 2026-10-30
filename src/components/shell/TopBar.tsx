"use client";

// One bar across the top: the desk's pages as tabs, then theme and account.
// Replaces the left sidebar so every page, Intake above all, gets the full width.
import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Box, Divider, IconButton, ListItemIcon, Menu, MenuItem, Tooltip, Typography } from "@mui/material";
import { Contact, FolderTree, Inbox, LayoutDashboard, LogOut, Moon, Rss, ShieldCheck, Sun } from "lucide-react";
import VartamaanMark from "./VartamaanMark";
import { useDesk } from "@/providers/DeskProvider";
import { useThemeMode } from "@/providers/MuiProvider";
import { Session } from "@/lib/auth";
import { canOpen, homePage, ROLE_META } from "@/lib/rbac";

export default function TopBar({ session, onLogout }: { session: Session; onLogout: () => void }) {
  const pathname = usePathname();
  const { items, access } = useDesk();
  const { mode, toggleTheme } = useThemeMode();
  const [accountAnchor, setAccountAnchor] = useState<HTMLElement | null>(null);

  const toReview = items.filter((i) => i.stage === "new").length;
  const tabs = [
    { label: "Overview", Icon: LayoutDashboard, path: "/dashboard" },
    { label: "Intake", Icon: Inbox, path: "/inbox", badge: toReview },
    { label: "FTP folders", Icon: FolderTree, path: "/ftp" },
    { label: "RSS feed", Icon: Rss, path: "/feed" },
    { label: "Reporters", Icon: Contact, path: "/reporters" },
    { label: "Users and roles", Icon: ShieldCheck, path: "/access" },
  ].filter((t) => canOpen(access, t.path));
  // The mark goes to the first page this person may open, which is not always the overview
  const home = homePage(access) ?? "/dashboard";

  const iconButtonSx = { width: 36, height: 36, borderRadius: "10px", color: "text.secondary", "&:hover": { color: "text.primary", backgroundColor: "action.hover" } };

  return (
    <Box
      component="header"
      sx={{ flexShrink: 0, display: "flex", alignItems: "center", gap: { xs: 1, md: 2 }, height: 56, px: { xs: 1.5, md: 2.5 }, backgroundColor: "background.paper", borderBottom: "1px solid", borderColor: "divider" }}
    >
      <Box component={Link} href={home} aria-label="Samvadia assignment desk, home" sx={{ display: "flex", alignItems: "center", gap: 1.25, color: "text.primary", textDecoration: "none", flexShrink: 0 }}>
        <VartamaanMark size={22} />
        <Box sx={{ display: { xs: "none", lg: "flex" }, alignItems: "baseline", gap: 1, whiteSpace: "nowrap" }}>
          <Typography component="span" sx={{ fontSize: "1rem", fontWeight: 600, letterSpacing: "-0.03em" }}>
            Samvadia
          </Typography>
          <Typography component="span" sx={{ fontSize: "0.8125rem", color: "text.secondary" }}>
            Assignment desk
          </Typography>
        </Box>
      </Box>

      <Box aria-hidden sx={{ width: "1px", height: 24, backgroundColor: "divider", display: { xs: "none", lg: "block" } }} />

      <Box component="nav" aria-label="Desk pages" sx={{ display: "flex", alignItems: "center", gap: 0.5, minWidth: 0, flex: 1, overflowX: "auto", scrollbarWidth: "none" }}>
        {tabs.map(({ label, Icon, path, badge }) => {
          const active = pathname === path;
          const tab = (
            <Box
              component={Link}
              href={path}
              aria-current={active ? "page" : undefined}
              aria-label={badge ? `${label}, ${badge} to review` : label}
              sx={{
                position: "relative",
                display: "inline-flex",
                alignItems: "center",
                gap: 0.75,
                height: 36,
                px: { xs: 1, md: 1.25 },
                borderRadius: "10px",
                flexShrink: 0,
                textDecoration: "none",
                whiteSpace: "nowrap",
                fontSize: "0.875rem",
                fontWeight: active ? 600 : 500,
                color: active ? "text.primary" : "text.secondary",
                backgroundColor: active ? "action.selected" : "transparent",
                transition: "background-color 0.15s, color 0.15s",
                "&:hover": { color: "text.primary", backgroundColor: active ? "action.selected" : "action.hover" },
                "&:focus-visible": { outline: "2px solid", outlineColor: "text.primary", outlineOffset: 1 },
              }}
            >
              <Icon size={18} />
              <Box component="span" sx={{ display: { xs: "none", md: "inline" } }}>
                {label}
              </Box>
              {!!badge && (
                <Box
                  component="span"
                  aria-hidden
                  sx={{
                    minWidth: 18,
                    height: 18,
                    px: 0.5,
                    borderRadius: "9px",
                    backgroundColor: "warning.main",
                    color: "warning.contrastText",
                    fontSize: "0.6875rem",
                    fontWeight: 700,
                    display: "grid",
                    placeItems: "center",
                    fontVariantNumeric: "tabular-nums",
                    // Icon-only tabs: the count sits on the icon's corner
                    position: { xs: "absolute", md: "static" },
                    top: { xs: 1, md: "auto" },
                    right: { xs: -2, md: "auto" },
                  }}
                >
                  {badge}
                </Box>
              )}
            </Box>
          );
          // Below md the tabs are icons, so the tooltip names them
          return (
            <Tooltip key={path} title={label} slotProps={{ tooltip: { sx: { display: { md: "none" } } } }}>
              {tab}
            </Tooltip>
          );
        })}
      </Box>

      <Tooltip title={mode === "light" ? "Dark mode" : "Light mode"}>
        <IconButton onClick={toggleTheme} aria-label="Toggle dark mode" sx={iconButtonSx}>
          {mode === "light" ? <Moon size={18} /> : <Sun size={18} />}
        </IconButton>
      </Tooltip>

      <Box
        component="button"
        onClick={(e: React.MouseEvent<HTMLElement>) => setAccountAnchor(e.currentTarget)}
        aria-label={`Account: ${session.username}`}
        aria-haspopup="menu"
        aria-expanded={!!accountAnchor}
        sx={{ display: "flex", alignItems: "center", gap: 1, height: 40, pl: 0.5, pr: { xs: 0.5, lg: 1.25 }, border: 0, borderRadius: "999px", background: "none", fontFamily: "inherit", color: "text.primary", cursor: "pointer", flexShrink: 0, "&:hover": { backgroundColor: "action.hover" } }}
      >
        <Box sx={{ width: 32, height: 32, borderRadius: "50%", backgroundColor: "text.primary", color: "background.paper", display: "grid", placeItems: "center", fontSize: "0.8125rem", fontWeight: 700 }}>
          {session.username.slice(0, 1).toUpperCase()}
        </Box>
        <Box sx={{ display: { xs: "none", lg: "block" }, textAlign: "left", lineHeight: 1.2 }}>
          <Typography sx={{ fontSize: "0.8125rem", fontWeight: 600 }}>{session.username}</Typography>
          <Typography sx={{ fontSize: "0.6875rem", color: "text.secondary" }}>{ROLE_META[session.role].label}</Typography>
        </Box>
      </Box>
      <Menu
        anchorEl={accountAnchor}
        open={!!accountAnchor}
        onClose={() => setAccountAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { mt: 0.5, minWidth: 220, borderRadius: "12px" } } }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography sx={{ fontSize: "0.875rem", fontWeight: 600 }}>{session.username}</Typography>
          <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>{ROLE_META[session.role].label}</Typography>
        </Box>
        <Divider />
        <MenuItem
          onClick={() => {
            setAccountAnchor(null);
            onLogout();
          }}
          sx={{ fontSize: "0.875rem" }}
        >
          <ListItemIcon>
            <LogOut size={16} />
          </ListItemIcon>
          Log out
        </MenuItem>
      </Menu>
    </Box>
  );
}
