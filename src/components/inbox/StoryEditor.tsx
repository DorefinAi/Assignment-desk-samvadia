"use client";

import React, { useState } from "react";
import { Box, Button, ButtonBase, MenuItem, TextField, Typography } from "@mui/material";
import { ChevronDown, FolderPen, FolderTree, RotateCcw, Shuffle } from "lucide-react";
import { FtpFolder, IntakeItem, Priority, StoryDraft } from "@/types/desk";
import { buildSlug, CATEGORIES, dayOf, filedName, folderPath, locationName, LOCATIONS, normaliseSlug, slugError } from "@/lib/slug";
import { KIND_ICON, MONO, PRIORITY_LABEL } from "@/components/common/shared";
import { ReporterOption } from "@/providers/deskContext";
import FieldSparkle from "./FieldSparkle";

interface StoryEditorProps {
  item: IntakeItem;
  folder?: FtpFolder;
  onChange: (patch: Partial<StoryDraft>) => void;
  onResetSlug: () => void;
  onRenameFolder: () => void;
  /** View only: every field is locked */
  readOnly?: boolean;
  /** Admins only: the FTP folder preview */
  canSeeFtp?: boolean;
  /** Show "Rename or move" for filed stories */
  canRename?: boolean;
  /** Next of the AI's headline suggestions */
  onAnotherHeadline?: () => void;
  /** Backend only: reporters to pick from, for a story from an unknown sender */
  reporters?: ReporterOption[];
  onReporter?: (reporterId: string) => void;
}

export const sectionTitleSx = { fontSize: "0.8125rem", fontWeight: 600, color: "text.primary", mb: 1 };

// Room for the sparkle beside a dropdown's arrow
const withSparkleSx = { "& .MuiInputAdornment-root": { mr: 2.5 } };

export default function StoryEditor({ item, folder, onChange, onResetSlug, onRenameFolder, readOnly = false, canSeeFtp = false, canRename = false, onAnotherHeadline, reporters = [], onReporter }: StoryEditorProps) {
  const { draft, ai } = item;
  const filed = !!folder;
  const slug = folder?.slug ?? draft.slug;
  const error = filed ? null : slugError(draft.slug, draft.locationCode);

  // A sparkle in every field the desk can change: the AI's suggestion for that field alone
  const aiHeadline = ai.headlines[item.aiHeadlineIndex];
  const aiSlug = buildSlug(ai.locationCode, ai.keywords);
  // No suggestions (no AI model yet, or a shadow-mode story): no sparkles at all
  const hasAi = ai.headlines.length > 0 && !item.blind;
  const sparkle = (show: boolean, node: React.ReactNode) => (show && hasAi && !readOnly ? { input: { endAdornment: node } } : undefined);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      {/* The slug needs a reporter: for an unknown sender the desk picks one first */}
      {onReporter && reporters.length > 0 && (
        <TextField
          select
          size="small"
          label="Reporter"
          value={item.reporterId ?? ""}
          onChange={(e) => onReporter(e.target.value)}
          disabled={readOnly || filed}
          error={!item.reporterId}
          helperText={!item.reporterId ? "Unknown sender. Pick the reporter to build the slug." : undefined}
        >
          {reporters.map((r) => (
            <MenuItem key={r.id} value={r.id}>
              {r.name} · {r.cityCode}
            </MenuItem>
          ))}
        </TextField>
      )}
      <TextField
        label="Headline"
        value={draft.headline}
        onChange={(e) => onChange({ headline: e.target.value })}
        fullWidth
        multiline
        maxRows={3}
        disabled={readOnly}
        error={!draft.headline.trim()}
        helperText={!draft.headline.trim() ? "A headline is needed before approval." : undefined}
        slotProps={sparkle(
          !!aiHeadline,
          <FieldSparkle
            label="Headline"
            suggestion={<Typography sx={{ fontWeight: 600, lineHeight: 1.5 }}>{aiHeadline}</Typography>}
            inUse={draft.headline === aiHeadline}
            onUse={() => onChange({ headline: aiHeadline })}
            extra={
              ai.headlines.length > 1 && onAnotherHeadline ? (
                <Button size="small" onClick={onAnotherHeadline} startIcon={<Shuffle size={13} />} sx={{ minHeight: 30, color: "text.secondary" }}>
                  Another ({item.aiHeadlineIndex + 1}/{ai.headlines.length})
                </Button>
              ) : undefined
            }
          />
        )}
      />
      <TextField
        label="Story text"
        value={draft.body}
        onChange={(e) => onChange({ body: e.target.value })}
        fullWidth
        multiline
        minRows={8}
        maxRows={18}
        disabled={readOnly}
        slotProps={{
          htmlInput: { style: { lineHeight: 1.65 } },
          ...sparkle(!!ai.body, <FieldSparkle label="Story text" top suggestion={<Typography sx={{ fontSize: "0.8125rem", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{ai.body}</Typography>} inUse={draft.body === ai.body} onUse={() => onChange({ body: ai.body })} />),
        }}
      />

      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 1.5 }}>
        <TextField
          select
          size="small"
          label="Location"
          sx={{ gridColumn: "1 / -1", ...(filed ? {} : withSparkleSx) }}
          value={draft.locationCode}
          onChange={(e) => onChange({ locationCode: e.target.value })}
          disabled={filed || readOnly}
          slotProps={sparkle(!filed, <FieldSparkle label="Location" suggestion={`${ai.locationCode} · ${locationName(ai.locationCode)}`} inUse={draft.locationCode === ai.locationCode} onUse={() => onChange({ locationCode: ai.locationCode })} />)}
        >
          {LOCATIONS.map((l) => (
            <MenuItem key={l.code} value={l.code}>
              {l.code} · {l.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Category"
          sx={withSparkleSx}
          value={draft.category}
          onChange={(e) => onChange({ category: e.target.value })}
          disabled={readOnly}
          slotProps={sparkle(true, <FieldSparkle label="Category" suggestion={ai.category} inUse={draft.category === ai.category} onUse={() => onChange({ category: ai.category })} />)}
        >
          {CATEGORIES.map((c) => (
            <MenuItem key={c} value={c}>
              {c}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Priority"
          sx={withSparkleSx}
          value={draft.priority}
          onChange={(e) => onChange({ priority: e.target.value as Priority })}
          disabled={readOnly}
          slotProps={sparkle(true, <FieldSparkle label="Priority" suggestion={PRIORITY_LABEL[ai.priority]} inUse={draft.priority === ai.priority} onUse={() => onChange({ priority: ai.priority })} />)}
        >
          {(Object.keys(PRIORITY_LABEL) as Priority[]).map((p) => (
            <MenuItem key={p} value={p}>
              {PRIORITY_LABEL[p]}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
        <TextField
          size="small"
          label="Slug"
          value={slug}
          disabled={filed || readOnly}
          onChange={(e) => onChange({ slug: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "_") })}
          onBlur={() => !filed && draft.slug !== normaliseSlug(draft.slug) && onChange({ slug: normaliseSlug(draft.slug) })}
          error={!!error}
          helperText={error ?? (draft.slugEdited && !filed ? "Edited by you" : undefined)}
          sx={{ flex: 1, minWidth: 0 }}
          slotProps={{
            htmlInput: { style: { fontFamily: MONO, fontWeight: 600 }, spellCheck: false },
            // Same location: the AI slug is the automatic one, so go back to it; otherwise type it in
            ...sparkle(
              !filed,
              <FieldSparkle
                label="Slug"
                suggestion={
                  <Box component="span" sx={{ fontFamily: MONO, fontWeight: 600 }}>
                    {aiSlug}
                  </Box>
                }
                inUse={draft.slug === aiSlug}
                onUse={() => (draft.locationCode === ai.locationCode ? onResetSlug() : onChange({ slug: aiSlug }))}
              />
            ),
          }}
        />
        {!readOnly && !filed && draft.slugEdited && (
          <Button variant="text" onClick={onResetSlug} startIcon={<RotateCcw size={14} />} sx={{ height: 40, color: "text.primary", flexShrink: 0 }}>
            Automatic
          </Button>
        )}
      </Box>

      {canSeeFtp && <FtpPreview item={item} folder={folder} slug={slug} readOnly={readOnly} canRename={canRename} onRenameFolder={onRenameFolder} />}
    </Box>
  );
}

/** Where approval puts the files. Collapsed: the path is enough most of the time. */
function FtpPreview({ item, folder, slug, readOnly, canRename, onRenameFolder }: { item: IntakeItem; folder?: FtpFolder; slug: string; readOnly: boolean; canRename: boolean; onRenameFolder: () => void }) {
  const [open, setOpen] = useState(false);
  const filed = !!folder;
  const location = folder?.locationCode ?? item.draft.locationCode;
  const files = item.attachments.filter((a) => (folder ? folder.attachmentIds.includes(a.id) : a.state === "downloaded"));
  const skipped = item.attachments.filter((a) => a.state !== "downloaded" && !folder?.attachmentIds.includes(a.id));

  return (
    <Box sx={{ borderRadius: "10px", border: "1px solid", borderColor: "divider", overflow: "hidden" }}>
      <Box sx={{ display: "flex", alignItems: "center" }}>
        <ButtonBase
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          sx={{ flex: 1, minWidth: 0, justifyContent: "flex-start", gap: 1, px: 1.5, py: 1, fontFamily: "inherit", color: "text.secondary", textAlign: "left" }}
        >
          <FolderTree size={14} style={{ flexShrink: 0 }} />
          <Box component="span" sx={{ fontFamily: MONO, fontSize: "0.75rem", fontWeight: 600, color: "text.primary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {folderPath(folder?.date ?? dayOf(item.receivedAt), location, slug || "…")}
          </Box>
          <ChevronDown size={14} style={{ flexShrink: 0, marginLeft: "auto", transform: open ? "rotate(180deg)" : undefined, transition: "transform 0.15s" }} />
        </ButtonBase>
        {filed && canRename && !readOnly && (
          <Button size="small" onClick={onRenameFolder} startIcon={<FolderPen size={13} />} sx={{ mr: 0.5, minHeight: 28, color: "text.primary", flexShrink: 0 }}>
            Rename
          </Button>
        )}
      </Box>
      {open && (
        <Box sx={{ px: 1.5, py: 1, display: "flex", flexDirection: "column", gap: 0.5, borderTop: "1px solid", borderColor: "divider" }}>
          <FileLine icon={<KIND_ICON.document size={13} />} name={`${slug}.txt`} note="headline and story text" />
          {files.map((a, i) => {
            const Icon = KIND_ICON[a.kind];
            return <FileLine key={a.id} icon={<Icon size={13} />} name={filedName(slug, i, a.fileName, a.kind)} note={a.fileName} />;
          })}
          {skipped.length > 0 && !filed && (
            <Typography sx={{ fontSize: "0.6875rem", color: "warning.main", mt: 0.5 }}>
              {skipped.length} {skipped.length === 1 ? "file is" : "files are"} still downloading or failed and won&apos;t be copied yet.
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
}

function FileLine({ icon, name, note }: { icon: React.ReactNode; name: string; note: string }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0, color: "text.secondary" }}>
      {icon}
      <Typography sx={{ fontFamily: MONO, fontSize: "0.75rem", color: "text.primary", whiteSpace: "nowrap" }}>{name}</Typography>
      <Typography sx={{ fontSize: "0.6875rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{note}</Typography>
    </Box>
  );
}
