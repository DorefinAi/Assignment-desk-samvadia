"use client";

// The sparkle inside a Story field: shows what the AI suggests for that one field, and puts it in.
import React, { useState } from "react";
import { Box, Button, IconButton, InputAdornment, Popover, Tooltip, Typography } from "@mui/material";
import { Sparkles } from "lucide-react";

interface FieldSparkleProps {
  /** Field name, e.g. "Headline" */
  label: string;
  suggestion: React.ReactNode;
  /** The field already holds the suggestion */
  inUse: boolean;
  onUse: () => void;
  /** More actions, e.g. another headline */
  extra?: React.ReactNode;
  /** Story text: sit at the top of the box rather than the middle */
  top?: boolean;
}

export default function FieldSparkle({ label, suggestion, inUse, onUse, extra, top }: FieldSparkleProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return (
    <InputAdornment position="end" sx={top ? { alignSelf: "flex-start", mt: 1.25, height: "auto" } : undefined}>
      <Tooltip title={`AI suggestion for ${label.toLowerCase()}`}>
        <IconButton size="small" edge="end" onClick={(e) => setAnchor(e.currentTarget)} aria-label={`AI suggestion for ${label.toLowerCase()}`} aria-haspopup="dialog" aria-expanded={!!anchor} sx={{ color: inUse ? "text.disabled" : "text.secondary", "&:hover": { color: "text.primary" } }}>
          <Sparkles size={16} />
        </IconButton>
      </Tooltip>
      <Popover
        open={!!anchor}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { role: "dialog", "aria-label": `AI suggestion for ${label.toLowerCase()}`, sx: { width: 340, maxWidth: "calc(100vw - 32px)", p: 1.5, mt: 0.5, borderRadius: "12px" } } }}
      >
        <Typography sx={{ display: "flex", alignItems: "center", gap: 0.75, fontSize: "0.75rem", fontWeight: 600, color: "text.secondary" }}>
          <Sparkles size={13} /> AI suggestion · {label}
        </Typography>
        <Box sx={{ mt: 1, fontSize: "0.875rem", lineHeight: 1.6, maxHeight: 220, overflowY: "auto", wordBreak: "break-word" }}>{suggestion}</Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1.5 }}>
          <Button
            size="small"
            variant="contained"
            disabled={inUse}
            onClick={() => {
              onUse();
              setAnchor(null);
            }}
            sx={{ minHeight: 30 }}
          >
            {inUse ? "In use" : "Use"}
          </Button>
          {extra}
        </Box>
      </Popover>
    </InputAdornment>
  );
}
