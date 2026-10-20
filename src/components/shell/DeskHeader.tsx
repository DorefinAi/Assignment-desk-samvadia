"use client";

// One line under the top bar saying what the page is for. The page's name is the active tab above it.
import React from "react";
import { usePathname } from "next/navigation";
import { Box, Typography } from "@mui/material";
import { Session } from "@/lib/auth";
import { can, ROUTE_PERMISSION } from "@/lib/rbac";

const HINTS: Record<string, string> = {
  "/dashboard": "WhatsApp and Outlook intake for one day, and who sent the news.",
  "/inbox": "Review each message, edit the story, then approve it into the Octopus.",
  "/ftp": "One folder per approved story. Rename the slug or move it to another location.",
  "/feed": "What Octopus reads. Each approved story is one entry.",
  "/access": "Who can see and change what on the assignment desk.",
};

export default function DeskHeader({ session }: { session: Session }) {
  const pathname = usePathname();
  // A page this role cannot open does not describe itself
  const hint = !ROUTE_PERMISSION[pathname] || can(session.role, ROUTE_PERMISSION[pathname]) ? HINTS[pathname] : undefined;
  if (!hint) return null;

  return (
    <Box sx={{ flexShrink: 0, display: { xs: "none", md: "flex" }, alignItems: "center", minHeight: 36, px: 2.5, borderBottom: "1px solid", borderColor: "divider", backgroundColor: "background.default" }}>
      <Typography noWrap sx={{ fontSize: "0.8125rem", color: "text.secondary" }}>
        {hint}
      </Typography>
    </Box>
  );
}
