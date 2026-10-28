"use client";

import React, { useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Radio, RadioGroup, TextField, Typography } from "@mui/material";

const REASONS = ["Duplicate of another story", "Not news / advertising", "Already covered", "Can't verify", "Visuals not usable", "Other"];

/** Same shape as the digital desk's reject dialog: pick one reason, add an optional note ("Other" needs the note). */
export default function RejectDialog({ headline, onReject, onClose }: { headline: string; onReject: (reason: string, note: string) => void; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const ready = reason !== "" && (reason !== "Other" || note.trim() !== "");
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs" slotProps={{ paper: { sx: { borderRadius: "16px" } } }}>
      <DialogTitle sx={{ fontSize: "1rem", fontWeight: 700, pb: 0.5 }}>Reject this story</DialogTitle>
      <DialogContent>
        <Typography sx={{ fontSize: "0.8125rem", color: "text.secondary", mb: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{headline}</Typography>
        <RadioGroup value={reason} onChange={(e) => setReason(e.target.value)} sx={{ mb: 1.5 }}>
          {REASONS.map((r) => (
            <FormControlLabel key={r} value={r} control={<Radio size="small" />} label={r} slotProps={{ typography: { sx: { fontSize: "0.875rem" } } }} />
          ))}
        </RadioGroup>
        <TextField
          size="small"
          multiline
          minRows={2}
          placeholder={reason === "Other" ? "Why? (needed for Other)" : "Note for the team (optional)"}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          fullWidth
          helperText="Kept with the story so the reporter can be told why."
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} sx={{ color: "text.primary" }}>
          Cancel
        </Button>
        <Button variant="contained" color="error" onClick={() => onReject(reason, note.trim())} disabled={!ready}>
          Reject
        </Button>
      </DialogActions>
    </Dialog>
  );
}
