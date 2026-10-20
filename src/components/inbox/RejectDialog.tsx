"use client";

import React, { useState } from "react";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from "@mui/material";

const REASONS = ["Duplicate of another story", "Not news / advertising", "Already covered", "Can't verify", "Visuals not usable"];

export default function RejectDialog({ headline, onReject, onClose }: { headline: string; onReject: (reason: string) => void; onClose: () => void }) {
  const [reason, setReason] = useState("");
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs" slotProps={{ paper: { sx: { borderRadius: "16px" } } }}>
      <DialogTitle sx={{ fontSize: "1rem", fontWeight: 700, pb: 0.5 }}>Reject this story?</DialogTitle>
      <DialogContent>
        <Typography sx={{ fontSize: "0.8125rem", color: "text.secondary", mb: 2, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{headline}</Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mb: 1.5 }}>
          {REASONS.map((r) => (
            <Box
              key={r}
              component="button"
              aria-pressed={reason === r}
              onClick={() => setReason(r)}
              sx={{
                px: 1.25,
                py: 0.5,
                borderRadius: "14px",
                border: "1px solid",
                borderColor: reason === r ? "text.primary" : "divider",
                backgroundColor: reason === r ? "text.primary" : "transparent",
                color: reason === r ? "background.paper" : "text.primary",
                fontFamily: "inherit",
                fontSize: "0.75rem",
                cursor: "pointer",
              }}
            >
              {r}
            </Box>
          ))}
        </Box>
        <TextField size="small" label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} fullWidth helperText="Kept with the story so the reporter can be told why." />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} sx={{ color: "text.primary" }}>
          Cancel
        </Button>
        <Button variant="contained" color="error" onClick={() => onReject(reason.trim())} disabled={!reason.trim()}>
          Reject
        </Button>
      </DialogActions>
    </Dialog>
  );
}
