"use client";

import React, { useState } from "react";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField, Typography } from "@mui/material";
import { ArrowDown } from "lucide-react";
import { FtpFolder } from "@/types/desk";
import { folderPath, LOCATIONS, normaliseSlug, relocateSlug, slugError } from "@/lib/slug";
import { useDesk } from "@/providers/DeskProvider";
import { MONO } from "@/components/common/shared";

/** Rename a story folder or move it to another location. Moving swaps the slug's location prefix. */
export default function FolderDialog({ folder, onClose }: { folder: FtpFolder; onClose: () => void }) {
  const { renameFolder } = useDesk();
  const [slug, setSlug] = useState(folder.slug);
  const [location, setLocation] = useState(folder.locationCode);
  const [error, setError] = useState<string | null>(null);

  const liveError = slugError(slug, location);
  const unchanged = slug === folder.slug && location === folder.locationCode;

  const changeLocation = (code: string) => {
    setSlug((s) => relocateSlug(s, location, code));
    setLocation(code);
    setError(null);
  };

  const save = () => {
    const result = renameFolder(folder.id, slug, location);
    if (result) setError(result);
    else onClose();
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" slotProps={{ paper: { sx: { borderRadius: "16px" } } }}>
      <DialogTitle sx={{ fontSize: "1rem", fontWeight: 700, pb: 0.5 }}>Rename or move folder</DialogTitle>
      <DialogContent>
        <Typography sx={{ fontSize: "0.8125rem", color: "text.secondary", mb: 2 }}>
          Files inside are renamed to match, and the RSS entry is updated so Octopus picks up the new path.
        </Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "180px 1fr" }, gap: 1.5 }}>
          <TextField select size="small" label="Location" value={location} onChange={(e) => changeLocation(e.target.value)}>
            {LOCATIONS.map((l) => (
              <MenuItem key={l.code} value={l.code}>
                {l.code} · {l.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            label="Slug"
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "_"));
              setError(null);
            }}
            onBlur={() => setSlug((s) => normaliseSlug(s))}
            error={!!(error || liveError)}
            helperText={error || liveError || " "}
            slotProps={{ htmlInput: { style: { fontFamily: MONO }, spellCheck: false } }}
          />
        </Box>
        <Box sx={{ mt: 1, p: 1.5, borderRadius: "10px", backgroundColor: "action.hover", fontFamily: MONO, fontSize: "0.75rem", lineHeight: 1.7, wordBreak: "break-all" }}>
          <Box sx={{ color: "text.secondary" }}>{folderPath(folder.date, folder.locationCode, folder.slug)}</Box>
          <Box sx={{ color: "text.secondary", display: "flex", py: 0.25 }} aria-hidden>
            <ArrowDown size={14} />
          </Box>
          <Box sx={{ fontWeight: 600 }}>{folderPath(folder.date, location, slug || "…")}</Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} sx={{ color: "text.primary" }}>
          Cancel
        </Button>
        <Button variant="contained" onClick={save} disabled={unchanged || !!liveError}>
          Save changes
        </Button>
      </DialogActions>
    </Dialog>
  );
}
