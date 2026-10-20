"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Box, Button, Switch, Tooltip, Typography } from "@mui/material";
import { Check, Copy, Rss } from "lucide-react";
import { useDesk } from "@/providers/DeskProvider";
import { FEED_URL } from "@/data/intakeData";
import { buildFeedXml } from "@/lib/rss";
import { locationName } from "@/lib/slug";
import { useCan } from "@/hooks/useCan";
import { clock, EmptyState, formatStamp, listFrameSx, MONO, Panel, PriorityTag, Slug } from "@/components/common/shared";

export default function FeedPage() {
  const { feed, items, folders, runs, setFeedLive } = useDesk();
  const canManage = useCan("feed.manage");
  const canSeeXml = useCan("feed.xml");
  const lastRead = runs.find((r) => r.source === "octopus")?.at;
  const [copied, setCopied] = useState(false);
  const xml = useMemo(() => buildFeedXml(FEED_URL, feed, items, folders), [feed, items, folders]);

  const live = feed.filter((e) => e.live);
  const waiting = live.filter((e) => !e.pulledAt).length;
  const sorted = [...feed].sort((a, b) => new Date(b.updatedAt ?? b.publishedAt).getTime() - new Date(a.updatedAt ?? a.publishedAt).getTime());

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(FEED_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked; the URL is selectable on screen
    }
  };

  return (
    <Box sx={{ px: { xs: 2, md: 3 }, py: 2.5, maxWidth: 1280, mx: "auto" }}>
      <Box sx={{ ...listFrameSx, display: "flex", alignItems: "center", gap: 2, px: 2, py: 1.5, mb: 2, flexWrap: "wrap" }}>
        <Box sx={{ width: 36, height: 36, borderRadius: "8px", display: "grid", placeItems: "center", backgroundColor: "action.hover", color: "text.primary" }}>
          <Rss size={18} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 220 }}>
          <Typography sx={{ fontSize: "0.875rem", fontWeight: 700 }}>Feed for Octopus</Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, minWidth: 0 }}>
            <Typography sx={{ fontSize: "0.75rem", color: "text.secondary", fontFamily: MONO, wordBreak: "break-all" }}>{FEED_URL}</Typography>
            <Tooltip title={copied ? "Copied" : "Copy feed link"}>
              <Box component="button" onClick={copy} aria-label="Copy feed link" sx={{ display: "flex", border: 0, background: "none", p: 0.5, borderRadius: "6px", color: "text.secondary", cursor: "pointer", "&:hover": { color: "text.primary", backgroundColor: "action.hover" } }}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </Box>
            </Tooltip>
          </Box>
        </Box>
        <Box sx={{ textAlign: "right" }}>
          <Typography sx={{ fontSize: "0.9375rem", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{live.length}</Typography>
          <Typography sx={{ fontSize: "0.6875rem", color: "text.secondary" }}>in the feed</Typography>
        </Box>
        <Box sx={{ textAlign: "right" }}>
          <Typography sx={{ fontSize: "0.9375rem", fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "text.primary" }}>{waiting}</Typography>
          <Typography sx={{ fontSize: "0.6875rem", color: "text.secondary" }}>not read yet</Typography>
        </Box>
        <Box sx={{ textAlign: "right" }}>
          <Typography sx={{ fontSize: "0.9375rem", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{lastRead ? clock(lastRead) : "–"}</Typography>
          <Typography sx={{ fontSize: "0.6875rem", color: "text.secondary" }}>last read by Octopus</Typography>
        </Box>
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: canSeeXml ? "minmax(0, 1fr) minmax(0, 1fr)" : "minmax(0, 1fr)" }, gap: 2, alignItems: "start" }}>
        <Panel title="Entries" hint={canManage ? "Switch an entry off to take it out of the feed without deleting the FTP folder." : "Every approved story Octopus can pick up."}>
          {sorted.length === 0 && <EmptyState title="The feed is empty" hint="Approve a story in Intake and it appears here." />}
          {sorted.map((entry, i) => {
            const item = items.find((it) => it.id === entry.itemId);
            const folder = folders.find((f) => f.id === entry.folderId);
            if (!item || !folder) return null;
            return (
              <Box key={entry.id} sx={{ display: "flex", gap: 1.5, alignItems: "flex-start", px: 2, py: 1.5, borderTop: i ? "1px solid" : "none", borderColor: "divider", opacity: entry.live ? 1 : 0.55 }}>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Box component={Link} href={`/inbox?item=${item.id}`} sx={{ color: "text.primary", textDecoration: "none", "&:hover": { textDecoration: "underline" } }}>
                    <Typography sx={{ fontSize: "0.8125rem", fontWeight: 600, lineHeight: 1.45 }}>{item.draft.headline}</Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5, flexWrap: "wrap", fontSize: "0.6875rem", color: "text.secondary" }}>
                    <Slug>{folder.slug}</Slug>
                    <PriorityTag priority={item.draft.priority} />
                    <span>{locationName(folder.locationCode)}</span>
                    <span>· {item.draft.category}</span>
                    <span>· {entry.updatedAt ? `updated ${formatStamp(entry.updatedAt)}` : `added ${formatStamp(entry.publishedAt)}`}</span>
                  </Box>
                  <Typography sx={{ fontSize: "0.6875rem", fontWeight: 600, mt: 0.5, color: !entry.live ? "text.secondary" : entry.pulledAt ? "success.main" : "text.primary" }}>
                    {!entry.live ? "Not in the feed" : entry.pulledAt ? `Read by Octopus at ${clock(entry.pulledAt)}` : "Waiting for Octopus to read it"}
                  </Typography>
                </Box>
                {canManage && <Switch checked={entry.live} onChange={(e) => setFeedLive(entry.id, e.target.checked)} slotProps={{ input: { "aria-label": `${folder.slug} in feed` } }} />}
              </Box>
            );
          })}
        </Panel>

        {canSeeXml && (
          <Panel
            title="Feed XML"
            hint="Exactly what Octopus receives from the link above."
            action={
              <Button size="small" variant="outlined" onClick={() => navigator.clipboard?.writeText(xml).catch(() => {})} startIcon={<Copy size={13} />} sx={{ minHeight: 30, borderColor: "divider", color: "text.primary" }}>
                Copy XML
              </Button>
            }
            sx={{ position: { lg: "sticky" }, top: { lg: 0 } }}
          >
            <Box component="pre" sx={{ m: 0, p: 2, maxHeight: { xs: 420, lg: "calc(100dvh - 300px)" }, overflow: "auto", fontFamily: MONO, fontSize: "0.6875rem", lineHeight: 1.6, color: "text.primary", backgroundColor: "action.hover", whiteSpace: "pre" }}>
              {xml}
            </Box>
          </Panel>
        )}
      </Box>
    </Box>
  );
}
