"use client";

import React from "react";
import { Box } from "@mui/material";
import { IntakeItem } from "@/types/desk";
import { SOURCE_META } from "@/components/common/shared";
import { initials, useChatColors } from "./chatTheme";

/** Round initials avatar with a small WhatsApp / Outlook badge in the corner. */
export default function ChatAvatar({ item, size = 48 }: { item: IntakeItem; size?: number }) {
  const c = useChatColors();
  const meta = SOURCE_META[item.source];
  const badge = Math.round(size * 0.4);
  return (
    <Box sx={{ position: "relative", width: size, height: size, flexShrink: 0 }} aria-hidden>
      <Box sx={{ width: "100%", height: "100%", borderRadius: "50%", display: "grid", placeItems: "center", fontSize: size * 0.3, fontWeight: 700, color: c.name[item.source], backgroundColor: `${meta.color}24` }}>
        {initials(item.sender.name)}
      </Box>
      <Box sx={{ position: "absolute", right: -2, bottom: -2, width: badge, height: badge, borderRadius: "50%", display: "grid", placeItems: "center", backgroundColor: c.list, boxShadow: `0 0 0 2px ${c.list}` }}>
        <meta.Icon size={Math.round(badge * 0.72)} color={meta.color} />
      </Box>
    </Box>
  );
}
