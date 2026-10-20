"use client";

import React from "react";
import { Box, Button, Typography } from "@mui/material";
import { Copy, ImageOff, MapPin, Shuffle, ShieldAlert } from "lucide-react";
import { AiFlag, IntakeItem } from "@/types/desk";
import { buildSlug, locationName } from "@/lib/slug";
import { MONO, PRIORITY_LABEL } from "@/components/common/shared";
import { sectionTitleSx } from "./StoryEditor";

const FLAG_ICON: Record<AiFlag["kind"], React.ReactNode> = {
  duplicate: <Copy size={14} />,
  verify: <ShieldAlert size={14} />,
  missing_media: <ImageOff size={14} />,
  location: <MapPin size={14} />,
};

const FLAG_LABEL: Record<AiFlag["kind"], string> = { duplicate: "Possible duplicate", verify: "Check before air", missing_media: "Media", location: "Location" };

interface AiPanelProps {
  item: IntakeItem;
  onApply: (part: "headline" | "body" | "all") => void;
  onAnotherHeadline: () => void;
  /** View only: suggestions are shown without the buttons that apply them */
  readOnly?: boolean;
}

/** Dummy AI suggestions. In production these come from the on-prem model via the agent. */
export default function AiPanel({ item, onApply, onAnotherHeadline, readOnly = false }: AiPanelProps) {
  const { ai, draft } = item;
  const headline = ai.headlines[item.aiHeadlineIndex];
  const suggestedSlug = buildSlug(ai.locationCode, ai.keywords);
  const fieldsMatch = draft.locationCode === ai.locationCode && draft.category === ai.category && draft.priority === ai.priority && draft.slug === suggestedSlug;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
      <Box>
        <Typography sx={{ fontSize: "0.875rem", fontWeight: 700 }}>Suggestions</Typography>
        <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>From the AI model, {Math.round(ai.confidence * 100)}% sure. Demo data until the model is connected.</Typography>
      </Box>

      {ai.flags.length > 0 && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {ai.flags.map((flag) => (
            <Box key={flag.text} sx={{ display: "flex", gap: 1, p: 1.25, borderRadius: "8px", border: "1px solid", borderColor: flag.kind === "duplicate" ? "warning.main" : "divider", color: "text.primary" }}>
              <Box sx={{ color: flag.kind === "duplicate" ? "warning.main" : "text.secondary", pt: "2px", flexShrink: 0 }}>{FLAG_ICON[flag.kind]}</Box>
              <Box>
                <Typography sx={{ fontSize: "0.6875rem", fontWeight: 700 }}>{FLAG_LABEL[flag.kind]}</Typography>
                <Typography sx={{ fontSize: "0.75rem", lineHeight: 1.5 }}>{flag.text}</Typography>
              </Box>
            </Box>
          ))}
        </Box>
      )}

      <Box>
        <Typography sx={sectionTitleSx}>Headline</Typography>
        <Typography sx={{ fontSize: "0.9375rem", fontWeight: 600, lineHeight: 1.5 }}>{headline}</Typography>
        <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
          {!readOnly && (
            <Button size="small" variant="outlined" onClick={() => onApply("headline")} disabled={draft.headline === headline} sx={{ minHeight: 30, borderColor: "divider", color: "text.primary" }}>
              {draft.headline === headline ? "In use" : "Use headline"}
            </Button>
          )}
          {ai.headlines.length > 1 && (
            <Button size="small" onClick={onAnotherHeadline} startIcon={<Shuffle size={13} />} sx={{ minHeight: 30, color: "text.secondary" }}>
              Another ({item.aiHeadlineIndex + 1}/{ai.headlines.length})
            </Button>
          )}
        </Box>
      </Box>

      <Box>
        <Typography sx={sectionTitleSx}>Summary for the desk</Typography>
        <Typography sx={{ fontSize: "0.8125rem", lineHeight: 1.55, color: "text.secondary" }}>{ai.summary}</Typography>
      </Box>

      {ai.body && (
        <Box>
          <Typography sx={sectionTitleSx}>Cleaned-up story text</Typography>
          <Typography sx={{ fontSize: "0.8125rem", lineHeight: 1.65, display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{ai.body}</Typography>
          {!readOnly && (
            <Button size="small" variant="outlined" onClick={() => onApply("body")} disabled={draft.body === ai.body} sx={{ mt: 1, minHeight: 30, borderColor: "divider", color: "text.primary" }}>
              {draft.body === ai.body ? "In use" : "Use this text"}
            </Button>
          )}
        </Box>
      )}

      <Box>
        <Typography sx={sectionTitleSx}>Detected</Typography>
        <Typography sx={{ fontSize: "0.8125rem", lineHeight: 1.55 }}>
          {[`${locationName(ai.locationCode)} (${ai.locationCode})`, ai.category, PRIORITY_LABEL[ai.priority]].join(" · ")}
        </Typography>
        <Typography sx={{ fontFamily: MONO, fontSize: "0.75rem", fontWeight: 600, wordBreak: "break-all", mt: 0.25 }}>{suggestedSlug}</Typography>
        {item.stage === "new" && !readOnly && (
          <Button size="small" variant="contained" onClick={() => onApply("all")} disabled={fieldsMatch && draft.headline === headline && draft.body === ai.body} sx={{ mt: 1.5, minHeight: 30 }}>
            Apply all suggestions
          </Button>
        )}
      </Box>
    </Box>
  );
}
