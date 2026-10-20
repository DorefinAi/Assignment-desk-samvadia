"use client";

// Intake looks like the app each message came from: WhatsApp items like WhatsApp Web, Outlook items
// like a mail reading pane. These are the surface colours for each theme; text and buttons keep the
// desk theme. The WhatsApp values follow jazimabbas/whatsapp-web-ui (light and dark).
import { useTheme } from "@mui/material";
import { Source } from "@/types/desk";

export interface ChatColors {
  /** Conversation background */
  wall: string;
  /** Dot pattern drawn over the wall */
  wallDots: string;
  /** Header and composer bars */
  bar: string;
  bubble: string;
  /** Rows inside a bubble (attachments) */
  bubbleInset: string;
  /** Time stamps, previews, secondary text */
  meta: string;
  list: string;
  listHover: string;
  listSelected: string;
  /** Hairlines between list rows */
  line: string;
  /** Active filter pill */
  pill: string;
  pillText: string;
  /** "Waiting for review" dot and time */
  unread: string;
  /** Sender name colour inside a bubble, per source */
  name: Record<Source, string>;
  /** The "TODAY" tag above the messages */
  dateTag: string;
  dateTagText: string;
  /** Yellow notice strip in the chat (rejected, sent to Octopus) */
  notice: string;
  noticeText: string;
  /** Email reading pane */
  mail: string;
  /** Email secondary text: address, date, "to" */
  mailMeta: string;
  /** Email attachment card preview area */
  mailTile: string;
}

const LIGHT: ChatColors = {
  wall: "#efeae2",
  wallDots: "rgba(17, 27, 33, 0.06)",
  bar: "#ededed",
  bubble: "#ffffff",
  bubbleInset: "#f5f5f5",
  meta: "#667781",
  list: "#ffffff",
  listHover: "#f5f5f5",
  listSelected: "#ebebeb",
  line: "#ededed",
  pill: "#d9fdd3",
  pillText: "#0a6b37",
  unread: "#1a9e4b",
  name: { whatsapp: "#0a7a3e", outlook: "#0f6cbd", portal: "#9a4508" },
  dateTag: "#e1f2fa",
  dateTagText: "#1f2a30",
  notice: "#fdf4c5",
  noticeText: "#3d3200",
  mail: "#ffffff",
  mailMeta: "#5e5e5e",
  mailTile: "#f2f2f2",
};

const DARK: ChatColors = {
  wall: "#0b141a",
  wallDots: "rgba(233, 237, 239, 0.05)",
  bar: "#323739",
  bubble: "#262d31",
  bubbleInset: "#1e2428",
  meta: "#a6a8aa",
  list: "#131c21",
  listHover: "#1e2a30",
  listSelected: "#323739",
  line: "#3c4247",
  pill: "#103529",
  pillText: "#4ade80",
  unread: "#25d366",
  name: { whatsapp: "#4ade80", outlook: "#6cb4ff", portal: "#fdba74" },
  dateTag: "#1e2a30",
  dateTagText: "rgba(241, 241, 242, 0.92)",
  notice: "#20272b",
  noticeText: "#fad964",
  mail: "#1f1f1f",
  mailMeta: "#c4c7c5",
  mailTile: "#2a2a2a",
};

export function useChatColors(): ChatColors {
  return useTheme().palette.mode === "dark" ? DARK : LIGHT;
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
