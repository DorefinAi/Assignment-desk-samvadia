"use client";

// One compact line near the subject: the reporter's slug as typed, the story type read from it, and the district.
// Renders nothing on an older backend that sends none of these.
import React from "react";
import { Box } from "@mui/material";
import { MapPin } from "lucide-react";
import { IntakeItem, ItemKind } from "@/types/desk";
import { Slug } from "@/components/common/shared";

export const KIND_LABEL: Record<ItemKind, string> = { story: "Stories", press_release: "Press releases", day_plan: "Day plans", not_a_story: "Not a story" };
/** One item of a kind, for the tag on a non-story */
const KIND_ONE: Record<ItemKind, string> = { story: "Story", press_release: "Press release", day_plan: "Day plan", not_a_story: "Not a story" };

const tagSx = { px: 0.75, lineHeight: "18px", fontSize: "0.6875rem", fontWeight: 700, borderRadius: "4px", border: "1px solid", borderColor: "text.primary", color: "text.primary", whiteSpace: "nowrap" } as const;


interface StoryMetaProps {
  item: IntakeItem;
  /** Secondary text colour of the surface it sits on */
  color: string;
  /** Leave the district out where it is already shown */
  withDistrict?: boolean;
  sx?: object;
}

export default function StoryMeta({ item, color, withDistrict = true, sx }: StoryMetaProps) {
  const type = item.parsed?.type;
  const nonStory = item.kind && item.kind !== "story";
  const district = withDistrict ? item.district : null;
  if (!(item.reporterSlug || type || nonStory || district)) return null;
  return (
    <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", columnGap: 1.25, rowGap: 0.5, ...sx }}>
      {item.reporterSlug && (
        <Box component="span" title="Reporter's slug, as sent">
          <Slug size="md">{item.reporterSlug}</Slug>
        </Box>
      )}
      {type && (
        <Box component="span" title="Story type" sx={tagSx}>
          {type}
        </Box>
      )}
      {nonStory && <Box component="span" sx={{ ...tagSx, borderColor: color, color }}>{KIND_ONE[item.kind!]}</Box>}
      {district && (
        <Box component="span" title={district.nameHi ?? undefined} sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, fontSize: "0.8125rem", color }}>
          <MapPin size={13} aria-hidden />
          {district.name}
          <Box component="span" sx={{ opacity: 0.75 }}>({district.code})</Box>
        </Box>
      )}
    </Box>
  );
}
