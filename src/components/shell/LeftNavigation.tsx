"use client";

// Same sidebar pattern as the digital desk (collapsible, drawer on small
// screens), with the assignment desk's sections.
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Box, Drawer, IconButton, Tooltip, Typography, useMediaQuery, useTheme } from "@mui/material";
import { ChevronsLeft, ChevronsRight, FolderTree, Inbox, LayoutDashboard, LogOut, Menu, Rss, ShieldCheck } from "lucide-react";
import NavigationLabel from "./NavigationLabel";
import VartamaanMark from "./VartamaanMark";
import { useDesk } from "@/providers/DeskProvider";
import { can, ROUTE_PERMISSION } from "@/lib/rbac";

const COLLAPSED_WIDTH = 64;
const EXPANDED_WIDTH = 224;

export default function LeftNavigation({ onLogout }: { onLogout: () => void }) {
  const pathname = usePathname();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("lg"));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { items, role } = useDesk();

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restore the saved sidebar width after hydration
      setCollapsed(localStorage.getItem("desk_sidebar") === "collapsed");
    } catch {
      // Storage blocked; keep it open
    }
  }, []);

  const toggleCollapse = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem("desk_sidebar", c ? "open" : "collapsed");
      } catch {
        // Storage blocked; the choice lasts for this visit only
      }
      return !c;
    });
  };

  const toReview = items.filter((i) => i.stage === "new").length;
  const navItems = [
    { label: "Overview", icon: <LayoutDashboard />, path: "/dashboard" },
    { label: "Intake", icon: <Inbox />, path: "/inbox", badge: toReview },
    { label: "FTP folders", icon: <FolderTree />, path: "/ftp" },
    { label: "RSS feed", icon: <Rss />, path: "/feed" },
    { label: "Users and roles", icon: <ShieldCheck />, path: "/access" },
  ].filter((item) => can(role, ROUTE_PERMISSION[item.path]));

  const narrow = collapsed && !isMobile;

  const content = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", pt: 1.5, pb: 1, px: narrow ? 0.75 : 1.25, overflowY: "auto", overflowX: "hidden" }}>
      <Box sx={{ px: narrow ? 0 : 0.75, py: 1, mb: 1, display: "flex", justifyContent: narrow ? "center" : "flex-start", alignItems: "center", gap: 1.25, minHeight: 40 }}>
        {narrow ? (
          <Tooltip title="Vartamaan · Assignment desk" placement="right" arrow>
            <Box sx={{ display: "flex" }} role="img" aria-label="Vartamaan assignment desk">
              <VartamaanMark size={20} />
            </Box>
          </Tooltip>
        ) : (
          <>
            <VartamaanMark size={22} />
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: "1.05rem", fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.15, whiteSpace: "nowrap" }}>Vartamaan</Typography>
              <Typography sx={{ fontSize: "0.75rem", color: "text.secondary", lineHeight: 1.2, whiteSpace: "nowrap" }}>Assignment desk</Typography>
            </Box>
          </>
        )}
      </Box>

      <Box component="nav" aria-label="Desk sections" sx={{ display: "flex", flexDirection: "column", gap: "2px", flexGrow: 1 }}>
        {navItems.map((item) => {
          const link = (
            <Box
              component={Link}
              href={item.path}
              onClick={() => isMobile && setMobileOpen(false)}
              aria-current={pathname === item.path ? "page" : undefined}
              sx={{ textDecoration: "none", color: "inherit", borderRadius: "8px" }}
            >
              <NavigationLabel label={item.label} logo={item.icon} isActive={pathname === item.path} collapsed={narrow} badge={item.badge} />
            </Box>
          );
          // Collapsed links show only an icon, so the tooltip supplies the name
          return narrow ? (
            <Tooltip key={item.path} title={item.label} placement="right" arrow>
              {link}
            </Tooltip>
          ) : (
            <React.Fragment key={item.path}>{link}</React.Fragment>
          );
        })}
      </Box>

      {/* Every message, person and number on these screens is sample data until the connectors exist */}
      {!narrow && (
        <Typography sx={{ px: 1.25, pb: 1, fontSize: "0.6875rem", color: "text.secondary", lineHeight: 1.4 }}>
          Demo data. Nothing is connected yet.
        </Typography>
      )}
      <Box sx={{ mt: "auto", pt: 1, borderTop: "1px solid", borderColor: "divider", display: "flex", flexDirection: "column", gap: 0.5 }}>
        {!isMobile && (
          <Box component="button" onClick={toggleCollapse} aria-label={narrow ? "Expand sidebar" : "Collapse sidebar"} sx={footerButtonSx(narrow)}>
            {narrow ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
            {!narrow && "Collapse"}
          </Box>
        )}
        <Box component="button" onClick={onLogout} aria-label="Log out" sx={footerButtonSx(narrow)}>
          <LogOut size={18} />
          {!narrow && "Log out"}
        </Box>
      </Box>
    </Box>
  );

  if (isMobile) {
    return (
      <>
        <IconButton
          aria-label="Open menu"
          onClick={() => setMobileOpen(true)}
          sx={{ position: "fixed", top: 10, left: 12, zIndex: 1201, width: 44, height: 44, borderRadius: "12px", backgroundColor: "background.paper", border: "1px solid", borderColor: "divider", "&:hover": { backgroundColor: "action.hover" } }}
        >
          <Menu size={20} />
        </IconButton>
        <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)} ModalProps={{ keepMounted: true }} sx={{ "& .MuiDrawer-paper": { width: 240 } }}>
          {content}
        </Drawer>
      </>
    );
  }

  return (
    <Box
      sx={{
        width: narrow ? COLLAPSED_WIDTH : EXPANDED_WIDTH,
        height: "100dvh",
        position: "sticky",
        top: 0,
        flexShrink: 0,
        backgroundColor: "background.paper",
        borderRight: "1px solid",
        borderColor: "divider",
        transition: "width 0.2s ease",
      }}
    >
      {content}
    </Box>
  );
}

const footerButtonSx = (narrow: boolean) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: narrow ? "center" : "flex-start",
  gap: 1,
  width: "100%",
  px: narrow ? 0 : 1.25,
  py: 0.85,
  border: 0,
  borderRadius: "8px",
  background: "none",
  fontFamily: "inherit",
  fontSize: "0.8125rem",
  fontWeight: 500,
  cursor: "pointer",
  color: "text.secondary",
  "&:hover": { backgroundColor: "action.hover", color: "text.primary" },
});
