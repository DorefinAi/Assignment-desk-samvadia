"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Box, Button, InputAdornment, TextField, Typography } from "@mui/material";
import { ChevronDown, ChevronRight, Folder, FolderOpen, FolderPen, Inbox, Search, Server } from "lucide-react";
import { useDesk } from "@/providers/DeskProvider";
import { FtpFolder } from "@/types/desk";
import { FTP_ROOT, filedName, folderPath, locationName } from "@/lib/slug";
import { FTP_HOST } from "@/lib/rss";
import { EmptyState, formatStamp, KIND_ICON, listFrameSx, MONO, PriorityTag } from "@/components/common/shared";
import FolderDialog from "@/components/ftp/FolderDialog";
import { useCan } from "@/hooks/useCan";

type Filter = { date: string; location?: string } | null;

export default function FtpPage() {
  const { folders, items, feed } = useDesk();
  const canRename = useCan("ftp.rename");
  const [filter, setFilter] = useState<Filter>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<FtpFolder | null>(null);

  // date -> location -> count, for the tree
  const tree = useMemo(() => {
    const byDate = new Map<string, Map<string, number>>();
    for (const f of folders) {
      const locs = byDate.get(f.date) ?? new Map<string, number>();
      locs.set(f.locationCode, (locs.get(f.locationCode) ?? 0) + 1);
      byDate.set(f.date, locs);
    }
    return [...byDate.entries()].sort(([a], [b]) => b.localeCompare(a)).map(([date, locs]) => ({ date, locations: [...locs.entries()].sort(([a], [b]) => a.localeCompare(b)) }));
  }, [folders]);

  const q = query.trim().toLowerCase();
  const visible = folders
    .filter((f) => !filter || (f.date === filter.date && (!filter.location || f.locationCode === filter.location)))
    .filter((f) => !q || f.slug.toLowerCase().includes(q) || (items.find((i) => i.id === f.itemId)?.draft.headline.toLowerCase().includes(q) ?? false))
    .sort((a, b) => new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime());

  const totalMb = folders.reduce((sum, f) => sum + (items.find((i) => i.id === f.itemId)?.attachments.filter((a) => f.attachmentIds.includes(a.id)).reduce((n, a) => n + a.sizeMb, 0) ?? 0), 0);

  return (
    <Box sx={{ px: { xs: 2, md: 3 }, py: 2.5, maxWidth: 1280, mx: "auto" }}>
      <Box sx={{ ...listFrameSx, display: "flex", alignItems: "center", gap: 2, px: 2, py: 1.5, mb: 2, flexWrap: "wrap" }}>
        <Box sx={{ width: 36, height: 36, borderRadius: "10px", display: "grid", placeItems: "center", backgroundColor: "action.hover" }}>
          <Server size={18} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography sx={{ fontSize: "0.875rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 1 }}>
            Newsroom FTP
            <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, fontSize: "0.6875rem", fontWeight: 600, color: "success.main" }}>
              <Box component="span" sx={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "currentColor" }} /> Connected
            </Box>
          </Typography>
          <Typography sx={{ fontSize: "0.75rem", color: "text.secondary", fontFamily: MONO }}>
            {FTP_HOST}
            {FTP_ROOT}
          </Typography>
        </Box>
        <Stat label="Folders" value={String(folders.length)} />
        <Stat label="Media filed" value={`${totalMb.toFixed(0)} MB`} />
        <Stat label="Disk free" value="1.8 TB" />
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "240px minmax(0, 1fr)" }, gap: 2, alignItems: "start" }}>
        {/* Folder tree */}
        <Box component="nav" aria-label="FTP folders by day and location" sx={{ ...listFrameSx, p: 1 }}>
          <TreeButton active={!filter} onClick={() => setFilter(null)} depth={0} icon={<FolderOpen size={15} />} label={FTP_ROOT.split("/").pop() ?? "desk"} count={folders.length} />
          {tree.map(({ date, locations }) => (
            <React.Fragment key={date}>
              <TreeButton active={filter?.date === date && !filter.location} onClick={() => setFilter({ date })} depth={1} icon={<Folder size={15} />} label={date} count={locations.reduce((n, [, c]) => n + c, 0)} />
              {locations.map(([code, count]) => (
                <TreeButton key={code} active={filter?.date === date && filter.location === code} onClick={() => setFilter({ date, location: code })} depth={2} icon={<Folder size={14} />} label={`${code} · ${locationName(code)}`} count={count} />
              ))}
            </React.Fragment>
          ))}
        </Box>

        {/* Folder list */}
        <Box sx={{ minWidth: 0 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5, flexWrap: "wrap" }}>
            <Typography sx={{ fontSize: "0.875rem", fontWeight: 700, mr: "auto", fontFamily: MONO, wordBreak: "break-all" }}>
              {filter ? `${FTP_ROOT}/${filter.date}/${filter.location ? `${filter.location}/` : ""}` : `${FTP_ROOT}/`}
            </Typography>
            <TextField
              size="small"
              placeholder="Find a slug or headline"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              sx={{ width: { xs: "100%", sm: 260 } }}
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search size={15} /></InputAdornment> }, htmlInput: { "aria-label": "Find a folder" } }}
            />
          </Box>

          <Box sx={listFrameSx}>
            {visible.length === 0 && <EmptyState title={q ? "No folder matches" : "No folders here yet"} hint={q ? "Search by slug, like JPR_CYBER, or a word from the headline." : "A folder is created when a story is approved in Intake."} />}
            {visible.map((folder, idx) => {
              const item = items.find((i) => i.id === folder.itemId);
              const entry = feed.find((e) => e.folderId === folder.id);
              const files = item?.attachments.filter((a) => folder.attachmentIds.includes(a.id)) ?? [];
              const expanded = open === folder.id;
              return (
                <Box key={folder.id} sx={{ borderTop: idx ? "1px solid" : "none", borderColor: "divider" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 1.5, py: 1.25 }}>
                    <Box
                      component="button"
                      onClick={() => setOpen(expanded ? null : folder.id)}
                      aria-expanded={expanded}
                      aria-label={`${expanded ? "Hide" : "Show"} files in ${folder.slug}`}
                      sx={{ display: "flex", alignItems: "center", gap: 1.25, flex: 1, minWidth: 0, border: 0, background: "none", p: 0, textAlign: "left", fontFamily: "inherit", color: "text.primary", cursor: "pointer" }}
                    >
                      <Box sx={{ color: "text.secondary", display: "flex" }}>{expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</Box>
                      <Box sx={{ color: "text.secondary", display: "flex" }}>{expanded ? <FolderOpen size={18} /> : <Folder size={18} />}</Box>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                          <Typography sx={{ fontFamily: MONO, fontSize: "0.8125rem", fontWeight: 700 }}>{folder.slug}</Typography>
                          {item && <PriorityTag priority={item.draft.priority} />}
                        </Box>
                        <Typography sx={{ fontSize: "0.75rem", color: "text.secondary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item?.draft.headline}</Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: { xs: "none", sm: "block" }, textAlign: "right", flexShrink: 0, mr: 1 }}>
                      <Typography sx={{ fontSize: "0.75rem" }}>
                        {files.length + 1} files · {locationName(folder.locationCode)}
                      </Typography>
                      <Typography sx={{ fontSize: "0.6875rem", color: "text.secondary" }}>
                        {folder.updatedAt ? `Changed ${formatStamp(folder.updatedAt)}` : `Created ${formatStamp(folder.createdAt)}`}
                        {entry && (entry.live ? (entry.pulledAt ? " · read by Octopus" : " · waiting for Octopus") : " · not in feed")}
                      </Typography>
                    </Box>
                    {canRename && (
                      <Button size="small" variant="outlined" onClick={() => setRenaming(folder)} startIcon={<FolderPen size={14} />} sx={{ minHeight: 32, flexShrink: 0, borderColor: "divider", color: "text.primary" }}>
                        Rename or move
                      </Button>
                    )}
                  </Box>

                  {expanded && (
                    <Box sx={{ px: 1.5, pb: 1.5, pl: { xs: 1.5, sm: 7 } }}>
                      <Typography sx={{ fontFamily: MONO, fontSize: "0.6875rem", color: "text.secondary", mb: 0.75, wordBreak: "break-all" }}>{folderPath(folder.date, folder.locationCode, folder.slug)}</Typography>
                      <Box sx={{ borderRadius: "8px", border: "1px solid", borderColor: "divider" }}>
                        <FileRow icon={<KIND_ICON.document size={14} />} name={`${folder.slug}.txt`} size="2 KB" note="headline and story text" />
                        {files.map((a, i) => {
                          const Icon = KIND_ICON[a.kind];
                          return <FileRow key={a.id} icon={<Icon size={14} />} name={filedName(folder.slug, i, a.fileName, a.kind)} size={`${a.sizeMb.toFixed(1)} MB`} note={`from ${a.fileName}`} />;
                        })}
                      </Box>
                      {item && (
                        <Button component={Link} href={`/inbox?item=${item.id}`} size="small" startIcon={<Inbox size={14} />} sx={{ mt: 1, color: "text.primary" }}>
                          Open story in intake
                        </Button>
                      )}
                    </Box>
                  )}
                </Box>
              );
            })}
          </Box>
        </Box>
      </Box>

      {renaming && <FolderDialog folder={renaming} onClose={() => setRenaming(null)} />}
    </Box>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ textAlign: "right" }}>
      <Typography sx={{ fontSize: "0.9375rem", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{value}</Typography>
      <Typography sx={{ fontSize: "0.6875rem", color: "text.secondary" }}>{label}</Typography>
    </Box>
  );
}

function TreeButton({ active, onClick, depth, icon, label, count }: { active: boolean; onClick: () => void; depth: number; icon: React.ReactNode; label: string; count: number }) {
  return (
    <Box
      component="button"
      onClick={onClick}
      aria-current={active ? "true" : undefined}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        width: "100%",
        py: 0.75,
        pr: 1,
        pl: 1 + depth * 1.75,
        border: 0,
        borderRadius: "6px",
        fontFamily: "inherit",
        fontSize: "0.8125rem",
        fontWeight: active ? 600 : 400,
        textAlign: "left",
        cursor: "pointer",
        color: active ? "text.primary" : "text.secondary",
        backgroundColor: active ? "action.selected" : "transparent",
        "&:hover": { backgroundColor: active ? "action.selected" : "action.hover", color: "text.primary" },
      }}
    >
      <Box sx={{ display: "flex", color: "text.secondary" }}>{icon}</Box>
      <Box component="span" sx={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {label}
      </Box>
      <Box component="span" sx={{ fontSize: "0.6875rem", fontVariantNumeric: "tabular-nums" }}>{count}</Box>
    </Box>
  );
}

function FileRow({ icon, name, size, note }: { icon: React.ReactNode; name: string; size: string; note: string }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 1.25, py: 0.75, "& + &": { borderTop: "1px solid", borderColor: "divider" } }}>
      <Box sx={{ color: "text.secondary", display: "flex" }}>{icon}</Box>
      <Typography sx={{ fontFamily: MONO, fontSize: "0.75rem", whiteSpace: "nowrap" }}>{name}</Typography>
      <Typography sx={{ fontSize: "0.6875rem", color: "text.secondary", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{note}</Typography>
      <Typography sx={{ fontSize: "0.6875rem", color: "text.secondary", fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>{size}</Typography>
    </Box>
  );
}
