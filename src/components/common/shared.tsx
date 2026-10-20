"use client";

// Small building blocks used across the desk. timeAgo, formatStamp, EmptyState
// and listFrameSx come from the digital desk's BreakingDesk/shared.tsx.
import React, { ReactNode } from "react";
import { Box, Typography } from "@mui/material";
import { FileText, Image as ImageIcon, LucideIcon, Mail, Mic, Smartphone, Video } from "lucide-react";
import { AttachmentKind, Priority, Source, Stage } from "@/types/desk";

export const WhatsAppIcon: React.FC<{ size?: number; color?: string }> = ({ size = 16, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden>
    <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.69.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35zM12.05 21.5h-.01a9.4 9.4 0 0 1-4.8-1.32l-.34-.2-3.57.94.95-3.48-.22-.36a9.4 9.4 0 0 1-1.44-5.02c0-5.2 4.23-9.43 9.44-9.43a9.37 9.37 0 0 1 9.43 9.44c0 5.2-4.24 9.43-9.44 9.43zm8.03-17.46A11.3 11.3 0 0 0 12.05.7C5.8.7.7 5.79.7 12.05c0 2 .52 3.95 1.52 5.67L.6 23.6l6.02-1.58a11.33 11.33 0 0 0 5.42 1.38h.01c6.26 0 11.35-5.09 11.35-11.35 0-3.03-1.18-5.88-3.32-8.02z" />
  </svg>
);

const OutlookIcon: React.FC<{ size?: number; color?: string }> = ({ size = 16, color }) => <Mail size={size} color={color} aria-hidden />;
const PortalIcon: React.FC<{ size?: number; color?: string }> = ({ size = 16, color }) => <Smartphone size={size} color={color} aria-hidden />;

export const SOURCE_META: Record<Source, { label: string; color: string; Icon: React.FC<{ size?: number; color?: string }> }> = {
  whatsapp: { label: "WhatsApp", color: "#1A9E4B", Icon: WhatsAppIcon },
  outlook: { label: "Outlook", color: "#0F6CBD", Icon: OutlookIcon },
  portal: { label: "Reporter app", color: "#B4530A", Icon: PortalIcon },
};

/** Square tile with the source glyph, used at the start of list rows. */
export const SourceMark: React.FC<{ source: Source; size?: number }> = ({ source, size = 28 }) => {
  const { color, Icon, label } = SOURCE_META[source];
  return (
    <Box
      title={label}
      sx={{ width: size, height: size, flexShrink: 0, borderRadius: "8px", display: "grid", placeItems: "center", color, backgroundColor: `${color}1a` }}
    >
      <Icon size={Math.round(size * 0.55)} color={color} />
    </Box>
  );
};

// Accent (warning) means "waiting on the desk"; work in progress stays in ink
const STAGE_STYLE: Record<Stage, { label: string; color: string }> = {
  new: { label: "To review", color: "warning.main" },
  filing: { label: "Sending", color: "text.primary" },
  filed: { label: "Sending", color: "text.primary" },
  published: { label: "Sent to Octopus", color: "success.main" },
  rejected: { label: "Rejected", color: "error.main" },
};

/** The dot marks the stage, so it shares the stage colour and never animates. */
export const StageLabel: React.FC<{ stage: Stage; dense?: boolean }> = ({ stage, dense }) => (
  <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, fontSize: dense ? "0.625rem" : "0.6875rem", fontWeight: 600, color: STAGE_STYLE[stage].color, whiteSpace: "nowrap" }}>
    <Box component="span" sx={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "currentColor" }} />
    {STAGE_STYLE[stage].label}
  </Box>
);

export const PRIORITY_LABEL: Record<Priority, string> = { normal: "Normal", high: "High", breaking: "Breaking" };

/** Breaking is solid red so it wins the row; high is an ink outline, so the accent stays for work waiting on the desk. Normal shows nothing. */
export const PriorityTag: React.FC<{ priority: Priority; dense?: boolean }> = ({ priority, dense }) =>
  priority === "normal" ? null : (
    <Box
      component="span"
      sx={{
        px: dense ? 0.5 : 0.75,
        fontSize: dense ? "0.625rem" : "0.6875rem",
        lineHeight: dense ? "14px" : "18px",
        fontWeight: 700,
        borderRadius: "4px",
        whiteSpace: "nowrap",
        border: "1px solid",
        ...(priority === "breaking"
          ? { borderColor: "error.main", backgroundColor: "error.main", color: "error.contrastText" }
          : { borderColor: "text.primary", color: "text.primary" }),
      }}
    >
      {PRIORITY_LABEL[priority]}
    </Box>
  );

/** The desk's identity motif: a story is named by its slug wherever it appears. */
export const Slug: React.FC<{ children: ReactNode; size?: "sm" | "md" }> = ({ children, size = "sm" }) => (
  <Box component="span" sx={{ fontFamily: MONO, fontWeight: 600, fontSize: size === "sm" ? "0.6875rem" : "0.8125rem", color: "text.primary", wordBreak: "break-all" }}>
    {children}
  </Box>
);

export const KIND_ICON: Record<AttachmentKind, LucideIcon> = { video: Video, image: ImageIcon, audio: Mic, document: FileText };

export function timeAgo(iso: string, now = Date.now()): string {
  const mins = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

/** "13 Oct, 18:30" */
export function formatStamp(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });
}

export const clock = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

export const MONO = 'var(--font-mono), ui-monospace, Consolas, monospace';

/** 40px outlined header buttons with a 12px radius, as in the digital desk header; 44px on phones for touch */
export const headerButtonSx = { border: "1px solid", borderColor: "divider", borderRadius: "12px", height: { xs: 44, sm: 40 }, color: "text.primary" };

export const listFrameSx = { backgroundColor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: "12px", overflow: "hidden" };

/** Bordered card with a title row. */
export const Panel: React.FC<{ title: string; hint?: string; action?: ReactNode; children: ReactNode; sx?: object }> = ({ title, hint, action, children, sx }) => (
  <Box sx={{ ...listFrameSx, display: "flex", flexDirection: "column", ...sx }}>
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 2, py: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography sx={{ fontSize: "0.875rem", fontWeight: 700 }}>{title}</Typography>
        {hint && <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>{hint}</Typography>}
      </Box>
      {action}
    </Box>
    {children}
  </Box>
);

/** Says why a list is empty and what fills it; `action` is the one step that does. */
export const EmptyState: React.FC<{ title: string; hint: string; action?: ReactNode }> = ({ title, hint, action }) => (
  <Box sx={{ py: 5, px: 2, textAlign: "center" }}>
    <Typography sx={{ fontSize: "0.875rem", fontWeight: 600 }}>{title}</Typography>
    <Typography sx={{ fontSize: "0.8125rem", color: "text.secondary", mt: 0.5 }}>{hint}</Typography>
    {action && <Box sx={{ mt: 1.5 }}>{action}</Box>}
  </Box>
);
