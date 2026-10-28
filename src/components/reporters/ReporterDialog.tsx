"use client";

// Add or edit one reporter: name, slug code, district, any number of emails, phone, active.
import React, { useState } from "react";
import { Autocomplete, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, MenuItem, Switch, TextField, Typography } from "@mui/material";
import { District } from "@/types/desk";
import { Reporter, ReporterInput } from "@/lib/apiReporters";
import { MONO } from "@/components/common/shared";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMPTY: ReporterInput = { name: "", slugCode: "", districtCode: "", emails: [], phone: "", active: true };

interface ReporterDialogProps {
  /** null adds a new reporter */
  reporter: Reporter | null;
  districts: District[];
  onSave: (input: ReporterInput) => Promise<string | null>;
  onClose: () => void;
}

export default function ReporterDialog({ reporter, districts, onSave, onClose }: ReporterDialogProps) {
  const [form, setForm] = useState<ReporterInput>(() => (reporter ? { ...reporter } : EMPTY));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<ReporterInput>) => {
    setForm((f) => ({ ...f, ...patch }));
    setError(null);
  };

  const slugError = form.slugCode && !/^[A-Za-z0-9]{2,16}$/.test(form.slugCode) ? "2 to 16 letters or digits." : null;
  const badEmail = form.emails.find((e) => !EMAIL.test(e));
  const ready = form.name.trim() && form.slugCode.trim() && !slugError && !badEmail;
  // Keep a district code that isn't in the list (an old city code) selectable
  const options = districts.length && form.districtCode && !districts.some((d) => d.code === form.districtCode) ? [...districts, { code: form.districtCode, name: form.districtCode }] : districts;

  const save = async () => {
    setSaving(true);
    const result = await onSave({ ...form, emails: form.emails.map((e) => e.trim().toLowerCase()) });
    setSaving(false);
    if (result) setError(result);
    else onClose();
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" slotProps={{ paper: { sx: { borderRadius: "16px" } } }}>
      <DialogTitle sx={{ fontSize: "1rem", fontWeight: 700, pb: 0.5 }}>{reporter ? `Edit ${reporter.name}` : "Add a reporter"}</DialogTitle>
      <DialogContent>
        <Typography sx={{ fontSize: "0.8125rem", color: "text.secondary", mb: 2 }}>
          Messages from these emails and this phone are matched to the reporter, and the slug code goes into the story slug.
        </Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5, pt: 0.5 }}>
          <TextField size="small" label="Name" value={form.name} onChange={(e) => set({ name: e.target.value })} required autoFocus sx={{ gridColumn: { sm: "1 / -1" } }} />
          <TextField
            size="small"
            label="Slug code"
            value={form.slugCode}
            onChange={(e) => set({ slugCode: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })}
            required
            error={!!slugError}
            helperText={slugError ?? "As it appears in the slug, e.g. SHUBHAM"}
            slotProps={{ htmlInput: { style: { fontFamily: MONO }, spellCheck: false, maxLength: 16 } }}
          />
          {districts.length > 0 ? (
            <TextField select size="small" label="District" value={form.districtCode} onChange={(e) => set({ districtCode: e.target.value })} helperText=" ">
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {options.map((d) => (
                <MenuItem key={d.code} value={d.code}>
                  {d.name} ({d.code})
                </MenuItem>
              ))}
            </TextField>
          ) : (
            <TextField
              size="small"
              label="District code"
              value={form.districtCode}
              onChange={(e) => set({ districtCode: e.target.value.toUpperCase().replace(/[^A-Z]/g, "") })}
              helperText="e.g. AJM"
              slotProps={{ htmlInput: { style: { fontFamily: MONO }, maxLength: 5 } }}
            />
          )}
          <Autocomplete
            multiple
            freeSolo
            autoSelect
            options={[] as string[]}
            value={form.emails}
            onChange={(_, value) => set({ emails: [...new Set(value.map((v) => v.trim()).filter(Boolean))] })}
            renderValue={(value, getItemProps) =>
              value.map((email, index) => {
                const { key, ...rest } = getItemProps({ index });
                return <Chip key={key} {...rest} size="small" label={email} color={EMAIL.test(email) ? "default" : "error"} variant="outlined" />;
              })
            }
            renderInput={(params) => (
              <TextField {...params} size="small" label="Emails" error={!!badEmail} helperText={badEmail ? `${badEmail} is not an email address.` : "Press Enter after each one."} />
            )}
            sx={{ gridColumn: { sm: "1 / -1" } }}
          />
          <TextField size="small" label="Phone" value={form.phone} onChange={(e) => set({ phone: e.target.value })} slotProps={{ htmlInput: { inputMode: "tel" } }} />
          <FormControlLabel
            control={<Switch checked={form.active} onChange={(e) => set({ active: e.target.checked })} />}
            label={form.active ? "Active" : "Inactive"}
            slotProps={{ typography: { sx: { fontSize: "0.875rem" } } }}
            sx={{ ml: 0, alignSelf: "start" }}
          />
        </Box>
        {error && (
          <Typography role="alert" sx={{ mt: 1.5, fontSize: "0.8125rem", color: "error.main" }}>
            {error}
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} sx={{ color: "text.primary" }}>
          Cancel
        </Button>
        <Button variant="contained" onClick={save} disabled={!ready || saving}>
          {saving ? "Saving" : reporter ? "Save changes" : "Add reporter"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
