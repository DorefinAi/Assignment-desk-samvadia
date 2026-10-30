"use client";

// One line under the top bar saying what the page is for. The page's name is the active tab above it.
import React from "react";
import { usePathname } from "next/navigation";
import { Box, Typography } from "@mui/material";
import { canOpen } from "@/lib/rbac";
import { useDesk } from "@/providers/DeskProvider";

const HINTS: Record<string, string> = {
  "/dashboard": "WhatsApp and Outlook intake for one day, and who sent the news.",
  "/inbox": "Review each message, edit the story, then approve it into the Octopus.",
  "/ftp": "One folder per approved story. Rename the slug or move it to another location.",
  "/feed": "What Octopus reads. Each approved story is one entry.",
  "/access": "Who can see and change what on the assignment desk.",
};

export default function DeskHeader() {
  const pathname = usePathname();
  const { access } = useDesk();
  // A page this person cannot open does not describe itself
  const hint = canOpen(access, pathname) ? HINTS[pathname] : undefined;
  if (!hint) return null;

  return (
    <Box sx={{ flexShrink: 0, display: { xs: "none", md: "flex" }, alignItems: "center", minHeight: 36, px: 2.5, borderBottom: "1px solid", borderColor: "divider", backgroundColor: "background.default" }}>
      <Typography noWrap sx={{ fontSize: "0.8125rem", color: "text.secondary" }}>
        {hint}
      </Typography>
    </Box>
  );
}
