"use client";

// Pick a story's footage folder by hand: browse the FTP read-only (GET /desk/ftp/browse), then save the folder
// with PUT /desk/items/{id}/footage. Nothing on the FTP changes; only the story remembers the folder.
import React, { useEffect, useState } from "react";
import { Box, Button, ButtonBase, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";
import { ChevronRight, CornerLeftUp, File, Folder } from "lucide-react";
import { FtpListing, IntakeItem } from "@/types/desk";
import { useDesk } from "@/providers/DeskProvider";
import { istStamp } from "@/lib/ist";
import { MONO } from "@/components/common/shared";
import { megabytes } from "./footageMeta";

const parentOf = (path: string) => path.replace(/\/+$/, "").replace(/\/[^/]*$/, "") || "/";
const join = (path: string, name: string) => `${path.replace(/\/+$/, "")}/${name}`;

type Result = { path: string; listing?: FtpListing; error?: string };

export default function FtpPickerDialog({ item, onClose }: { item: IntakeItem; onClose: () => void }) {
  const { browseFtp, setFootage, districts } = useDesk();
  const current = item.footage?.path ?? null;
  const districtFolder = districts.find((d) => d.code === item.district?.code)?.ftpFolder ?? null;
  const [path, setPath] = useState(current ?? districtFolder ?? "/");
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    browseFtp(path).then(
      (listing) => live && setResult({ path, listing }),
      (err: unknown) => live && setResult({ path, error: err instanceof Error ? err.message : "Could not read the FTP." })
    );
    return () => {
      live = false;
    };
  }, [browseFtp, path, attempt]);

  const loading = result?.path !== path;
  const entries = [...(result?.listing?.entries ?? [])].sort((a, b) => Number(b.dir) - Number(a.dir) || a.name.localeCompare(b.name));
  const fileCount = entries.filter((e) => !e.dir).length;
  const crumbs = path.split("/").filter(Boolean);

  const go = (next: string) => {
    setSaveError(null);
    setPath(next);
  };

  const save = async (next: string | null) => {
    setSaving(true);
    setSaveError(null);
    const error = await setFootage(item.id, next);
    setSaving(false);
    if (error) setSaveError(error);
    else onClose();
  };

  const rowSx = { display: "flex", alignItems: "center", gap: 1.25, width: "100%", px: 1.5, py: 1, textAlign: "left", fontFamily: "inherit", fontSize: "0.8125rem", borderTop: "1px solid", borderColor: "divider" };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" slotProps={{ paper: { sx: { borderRadius: "16px" } } }}>
      <DialogTitle sx={{ fontSize: "1rem", fontWeight: 700, pb: 0.5 }}>Pick the footage folder</DialogTitle>
      <DialogContent>
        <Typography sx={{ fontSize: "0.8125rem", color: "text.secondary", mb: 1.5 }}>
          Open the folder that holds this story&apos;s footage, then use it. The FTP is only read, never changed.
        </Typography>

        <Box component="nav" aria-label="Folder path" sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 0.25, mb: 1, fontFamily: MONO, fontSize: "0.75rem" }}>
          <ButtonBase onClick={() => go("/")} sx={{ px: 0.5, borderRadius: "4px", fontFamily: "inherit", fontWeight: path === "/" ? 700 : 400 }}>
            FTP
          </ButtonBase>
          {crumbs.map((name, i) => {
            const to = "/" + crumbs.slice(0, i + 1).join("/");
            const last = i === crumbs.length - 1;
            return (
              <React.Fragment key={to}>
                <ChevronRight size={12} aria-hidden />
                <ButtonBase onClick={() => go(to)} aria-current={last ? "location" : undefined} sx={{ px: 0.5, borderRadius: "4px", fontFamily: "inherit", fontWeight: last ? 700 : 400, wordBreak: "break-all" }}>
                  {name}
                </ButtonBase>
              </React.Fragment>
            );
          })}
        </Box>

        <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: "8px", overflow: "hidden", height: { xs: 300, sm: 340 }, overflowY: "auto" }} aria-busy={loading}>
          {path !== "/" && (
            <ButtonBase onClick={() => go(parentOf(path))} sx={{ ...rowSx, borderTop: "none", color: "text.secondary" }}>
              <CornerLeftUp size={16} /> Up one folder
            </ButtonBase>
          )}
          {loading ? (
            <Box sx={{ display: "grid", placeItems: "center", py: 6 }}>
              <CircularProgress size={22} color="inherit" aria-label="Loading folder" />
            </Box>
          ) : result?.error ? (
            <Box sx={{ px: 2, py: 4, textAlign: "center" }}>
              <Typography sx={{ fontSize: "0.8125rem", fontWeight: 600 }}>Couldn&apos;t open this folder</Typography>
              <Typography sx={{ fontSize: "0.75rem", color: "text.secondary", mt: 0.5 }}>{result.error}</Typography>
              <Box sx={{ mt: 1.5, display: "flex", gap: 1, justifyContent: "center" }}>
                <Button size="small" variant="outlined" onClick={() => setAttempt((n) => n + 1)} sx={{ borderColor: "divider", color: "text.primary" }}>
                  Try again
                </Button>
                {path !== "/" && (
                  <Button size="small" onClick={() => go("/")} sx={{ color: "text.primary" }}>
                    Go to the top
                  </Button>
                )}
              </Box>
            </Box>
          ) : entries.length === 0 ? (
            <Typography sx={{ px: 2, py: 4, textAlign: "center", fontSize: "0.8125rem", color: "text.secondary" }}>This folder is empty.</Typography>
          ) : (
            entries.map((e) =>
              e.dir ? (
                <ButtonBase key={e.name} onClick={() => go(join(path, e.name))} sx={{ ...rowSx, "&:hover": { backgroundColor: "action.hover" } }}>
                  <Folder size={16} aria-hidden />
                  <Box component="span" sx={{ flex: 1, minWidth: 0, fontWeight: 500, wordBreak: "break-all" }}>
                    {e.name}
                  </Box>
                  <ChevronRight size={14} aria-hidden />
                </ButtonBase>
              ) : (
                <Box key={e.name} sx={{ ...rowSx, color: "text.secondary" }}>
                  <File size={16} aria-hidden />
                  <Box component="span" sx={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "text.primary" }} title={e.name}>
                    {e.name}
                  </Box>
                  <Box component="span" sx={{ fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>{e.bytes !== null ? megabytes(e.bytes) : ""}</Box>
                  <Box component="span" sx={{ fontVariantNumeric: "tabular-nums", flexShrink: 0, display: { xs: "none", sm: "inline" } }}>
                    {e.modified ? istStamp(new Date(e.modified).getTime()) : ""}
                  </Box>
                </Box>
              )
            )
          )}
        </Box>

        <Typography sx={{ mt: 1, fontSize: "0.75rem", color: "text.secondary" }}>
          {path === "/" ? "Open a district folder first." : loading || result?.error ? " " : `${fileCount} ${fileCount === 1 ? "file" : "files"} in this folder.`}
        </Typography>
        {saveError && (
          <Typography role="alert" sx={{ mt: 0.5, fontSize: "0.8125rem", color: "error.main" }}>
            {saveError}
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, flexWrap: "wrap", gap: 1 }}>
        {current && (
          <Button onClick={() => save(null)} disabled={saving} sx={{ color: "text.primary", mr: "auto" }}>
            Clear folder
          </Button>
        )}
        <Button onClick={onClose} sx={{ color: "text.primary" }}>
          Cancel
        </Button>
        <Button variant="contained" onClick={() => save(path)} disabled={saving || loading || !!result?.error || path === "/"}>
          {saving ? "Saving" : "Use this folder"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
