"use client";

import React from "react";
import { Box, Typography } from "@mui/material";
import { Check, X } from "lucide-react";
import { FeedEntry, IntakeItem } from "@/types/desk";
import { SOURCE_META } from "@/components/common/shared";

type StepState = "done" | "active" | "todo" | "error";

interface Step {
  label: string;
  detail: string;
  state: StepState;
}

function stepsFor(item: IntakeItem, entry?: FeedEntry): Step[] {
  const total = item.attachments.length;
  const done = item.attachments.filter((a) => a.state === "downloaded").length;
  const failed = item.attachments.filter((a) => a.state === "failed").length;
  const loading = item.attachments.filter((a) => a.state === "downloading");
  const pct = loading.length ? Math.round(loading.reduce((n, a) => n + a.progress, 0) / loading.length) : 0;
  const reviewed = item.stage === "filing" || item.stage === "filed" || item.stage === "published";

  return [
    { label: "Received", detail: SOURCE_META[item.source].label, state: "done" },
    {
      label: "Media",
      detail: total === 0 ? "No media" : loading.length ? `${done}/${total} · ${pct}%` : failed ? `${failed} failed` : `${done}/${total} downloaded`,
      state: total === 0 || (!loading.length && !failed) ? "done" : failed && !loading.length ? "error" : "active",
    },
    {
      label: "Review",
      detail: item.stage === "rejected" ? "Rejected" : reviewed ? `By ${item.reviewedBy}` : "Waiting",
      state: item.stage === "rejected" ? "error" : reviewed ? "done" : "active",
    },
    {
      label: "FTP folder",
      detail: item.stage === "filing" ? "Creating" : item.stage === "filed" || item.stage === "published" ? "Created" : "Not yet",
      state: item.stage === "filing" ? "active" : item.stage === "filed" || item.stage === "published" ? "done" : "todo",
    },
    {
      label: "RSS feed",
      detail: item.stage !== "published" ? (item.stage === "filed" ? "Adding" : "Not yet") : !entry?.live ? "Taken out" : entry.pulledAt ? "Read by Octopus" : "Waiting for Octopus",
      state: item.stage === "published" ? (entry?.live ? "done" : "error") : item.stage === "filed" ? "active" : "todo",
    },
  ];
}

// In progress stays in ink; colour is kept for done and for problems (see DESIGN.md)
const COLOR: Record<StepState, string> = { done: "success.main", active: "text.primary", todo: "divider", error: "error.main" };

export default function PipelineSteps({ item, entry }: { item: IntakeItem; entry?: FeedEntry }) {
  const steps = stepsFor(item, entry);
  return (
    <Box component="ol" aria-label="Story progress" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))" }}>
      {steps.map((step, i) => (
        <Box component="li" key={step.label} sx={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", px: 0.5 }}>
          {i > 0 && (
            <Box
              aria-hidden
              sx={{ position: "absolute", top: 10, right: "50%", width: "100%", height: 2, backgroundColor: steps[i - 1].state === "done" && step.state !== "todo" ? "success.main" : "divider", zIndex: 0 }}
            />
          )}
          <Box
            sx={{
              position: "relative",
              zIndex: 1,
              width: 22,
              height: 22,
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              color: "background.paper",
              border: "2px solid",
              borderColor: COLOR[step.state],
              backgroundColor: step.state === "done" || step.state === "error" ? COLOR[step.state] : "background.paper",
            }}
          >
            {step.state === "done" && <Check size={13} strokeWidth={3} />}
            {step.state === "error" && <X size={13} strokeWidth={3} />}
            {step.state === "active" && (
              <Box sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "text.primary" }} />
            )}
          </Box>
          <Typography sx={{ mt: 0.5, fontSize: { xs: "0.6875rem", sm: "0.75rem" }, lineHeight: 1.3, fontWeight: 600, color: step.state === "todo" ? "text.secondary" : "text.primary" }}>{step.label}</Typography>
          <Typography sx={{ fontSize: { xs: "0.625rem", sm: "0.6875rem" }, lineHeight: 1.35, mt: 0.25, color: step.state === "error" ? "error.main" : "text.secondary", fontVariantNumeric: "tabular-nums" }}>{step.detail}</Typography>
        </Box>
      ))}
    </Box>
  );
}
