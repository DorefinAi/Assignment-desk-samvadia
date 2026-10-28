"use client";

// The reporter list (#10): who files stories, the slug code they use, their district, emails and phone.
import React, { useCallback, useEffect, useState } from "react";
import { Box, Button, CircularProgress, IconButton, InputAdornment, TextField, Tooltip, Typography } from "@mui/material";
import { Pencil, Plus, Search } from "lucide-react";
import { useDesk } from "@/providers/DeskProvider";
import { useCan } from "@/hooks/useCan";
import { addReporter, listReporters, Reporter, ReporterInput, saveReporter } from "@/lib/apiReporters";
import { EmptyState, MONO, Panel } from "@/components/common/shared";
import ReporterDialog from "@/components/reporters/ReporterDialog";

type Load = { state: "loading" } | { state: "error"; message: string } | { state: "ready"; reporters: Reporter[] };

export default function ReportersPage() {
  const { live, districts } = useDesk();
  const canManage = useCan("reporters.manage");
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState("");
  // undefined: closed; null: adding; a reporter: editing
  const [editing, setEditing] = useState<Reporter | null | undefined>(undefined);

  useEffect(() => {
    if (!live) return;
    let current = true;
    listReporters().then(
      (reporters) => current && setLoad({ state: "ready", reporters }),
      (err: unknown) => current && setLoad({ state: "error", message: err instanceof Error ? err.message : "Could not load reporters." })
    );
    return () => {
      current = false;
    };
  }, [live, attempt]);

  const districtName = useCallback((code: string) => districts.find((d) => d.code === code)?.name ?? null, [districts]);

  const save = async (input: ReporterInput): Promise<string | null> => {
    try {
      const saved = editing ? await saveReporter(editing.id, input, districtName(input.districtCode)) : await addReporter(input, districtName(input.districtCode));
      setLoad((l) => (l.state === "ready" ? { state: "ready", reporters: editing ? l.reporters.map((r) => (r.id === saved.id ? saved : r)) : [...l.reporters, saved] } : l));
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : "Could not save. Try again.";
    }
  };

  const q = query.trim().toLowerCase();
  const rows =
    load.state === "ready"
      ? load.reporters
          .filter((r) => !q || [r.name, r.slugCode, r.districtCode, r.phone, ...r.emails].some((t) => t.toLowerCase().includes(q)))
          .sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name))
      : [];

  const action = (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      {live && (
        <TextField
          size="small"
          placeholder="Search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          slotProps={{
            htmlInput: { "aria-label": "Search reporters" },
            input: { startAdornment: (<InputAdornment position="start"><Search size={15} /></InputAdornment>) },
          }}
          sx={{ width: { xs: 140, sm: 220 } }}
        />
      )}
      {live && canManage && (
        <Button variant="contained" onClick={() => setEditing(null)} startIcon={<Plus size={15} />}>
          Add reporter
        </Button>
      )}
    </Box>
  );

  const cellSx = { px: 1.5, py: 1.25, borderTop: "1px solid", borderColor: "divider", textAlign: "left", verticalAlign: "top" } as const;

  return (
    <Box sx={{ px: { xs: 2, md: 3 }, py: 2.5, maxWidth: 1280, mx: "auto" }}>
      <Panel title="Reporters" hint={canManage ? "Who files stories, and how their messages are matched." : "Who files stories. Admins add and edit reporters."} action={action}>
        {!live ? (
          <EmptyState title="The reporter list comes from the backend" hint="Connect the desk to the backend to see and edit reporters." />
        ) : load.state === "loading" ? (
          <Box sx={{ display: "grid", placeItems: "center", py: 6 }}>
            <CircularProgress size={22} color="inherit" aria-label="Loading reporters" />
          </Box>
        ) : load.state === "error" ? (
          <EmptyState
            title="Couldn't load the reporter list"
            hint={load.message}
            action={
              <Button variant="outlined" onClick={() => (setLoad({ state: "loading" }), setAttempt((n) => n + 1))} sx={{ borderColor: "divider", color: "text.primary" }}>
                Try again
              </Button>
            }
          />
        ) : rows.length === 0 ? (
          <EmptyState title={q ? "No reporter matches that search" : "No reporters yet"} hint={q ? "Try a name, slug code, email or phone." : canManage ? "Add the first reporter so their messages are matched." : "An admin adds reporters here."} />
        ) : (
          <Box sx={{ overflowX: "auto" }}>
            <Box component="table" sx={{ width: "100%", minWidth: 760, borderCollapse: "collapse", fontSize: "0.8125rem", "& th, & td": cellSx }}>
              <thead>
                <tr>
                  {["Name", "Slug code", "District", "Emails", "Phone", "Status"].map((h) => (
                    <Box component="th" scope="col" key={h} sx={{ fontWeight: 600, color: "text.secondary", borderTop: "none !important", whiteSpace: "nowrap" }}>
                      {h}
                    </Box>
                  ))}
                  {canManage && (
                    <Box component="th" scope="col" sx={{ borderTop: "none !important", width: 52 }}>
                      <Box component="span" sx={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
                        Edit
                      </Box>
                    </Box>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const district = districts.find((d) => d.code === r.districtCode);
                  return (
                    <Box component="tr" key={r.id} sx={{ color: r.active ? "text.primary" : "text.secondary" }}>
                      <Box component="td" sx={{ fontWeight: 600 }}>{r.name}</Box>
                      <Box component="td" sx={{ fontFamily: MONO, fontWeight: 600 }}>{r.slugCode}</Box>
                      <Box component="td" sx={{ whiteSpace: "nowrap" }}>
                        {district ? `${district.name} (${district.code})` : r.districtCode || <Box component="span" sx={{ color: "text.secondary" }}>None</Box>}
                      </Box>
                      <Box component="td" sx={{ wordBreak: "break-all" }}>
                        {r.emails.length ? r.emails.map((e) => <Box key={e}>{e}</Box>) : <Box component="span" sx={{ color: "text.secondary" }}>None</Box>}
                      </Box>
                      <Box component="td" sx={{ whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{r.phone || <Box component="span" sx={{ color: "text.secondary" }}>None</Box>}</Box>
                      <Box component="td">
                        <Typography component="span" sx={{ fontSize: "0.75rem", fontWeight: 600, color: r.active ? "success.main" : "text.secondary" }}>
                          {r.active ? "Active" : "Inactive"}
                        </Typography>
                      </Box>
                      {canManage && (
                        <Box component="td" sx={{ py: "6px !important" }}>
                          <Tooltip title="Edit">
                            <IconButton onClick={() => setEditing(r)} aria-label={`Edit ${r.name}`} sx={{ color: "text.secondary" }}>
                              <Pencil size={16} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      )}
                    </Box>
                  );
                })}
              </tbody>
            </Box>
          </Box>
        )}
      </Panel>
      {editing !== undefined && <ReporterDialog key={editing?.id ?? "new"} reporter={editing} districts={districts} onSave={save} onClose={() => setEditing(undefined)} />}
    </Box>
  );
}
