"use client";

// WhatsApp, Outlook and the Octopus read status are fetched by a background cron.
// Refresh pulls in whatever it has collected since the last look.
import React, { useState } from "react";
import { Alert, Box, Button, CircularProgress, Snackbar, Typography } from "@mui/material";
import { RefreshCw } from "lucide-react";
import { RefreshResult, useDesk } from "@/providers/DeskProvider";
import { useNow } from "@/hooks/useNow";
import { headerButtonSx, timeAgo } from "@/components/common/shared";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function summary({ whatsapp, outlook, octopus }: RefreshResult) {
  const total = whatsapp + outlook;
  const sources = [whatsapp && `${whatsapp} WhatsApp`, outlook && `${outlook} Outlook`].filter(Boolean).join(", ");
  const messages = total ? `${plural(total, "new message", "new messages")} (${sources})` : "No new messages";
  return octopus ? `${messages}. Octopus read ${plural(octopus, "feed entry", "feed entries")}.` : messages;
}

export default function RefreshButton() {
  const { runs, refresh } = useDesk();
  const now = useNow(15000);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ text: string; failed?: boolean } | null>(null);
  const last = runs[0]?.at;

  const run = () => {
    setBusy(true);
    // Short delay stands in for the round-trip to the server
    setTimeout(() => {
      try {
        setToast({ text: summary(refresh()) });
      } catch {
        // TODO: real network errors arrive here once refresh calls the backend
        setToast({ text: "Couldn't reach the server, so nothing was fetched. Check the connection and press Refresh again.", failed: true });
      }
      setBusy(false);
    }, 600);
  };

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
      {last && (
        <Typography sx={{ fontSize: "0.6875rem", color: "text.secondary", whiteSpace: "nowrap", display: { xs: "none", md: "block" } }}>
          Updated {timeAgo(last, now)}
        </Typography>
      )}
      <Button
        variant="outlined"
        onClick={run}
        disabled={busy}
        aria-label="Refresh WhatsApp, Outlook and the RSS feed"
        startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <RefreshCw size={16} />}
        sx={{ ...headerButtonSx, minWidth: { xs: 44, sm: 0 }, px: { xs: 0, sm: 1.5 }, "& .MuiButton-startIcon": { mr: { xs: 0, sm: 1 }, ml: { xs: 0, sm: -0.5 } } }}
      >
        <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
          {busy ? "Refreshing" : "Refresh"}
        </Box>
      </Button>
      {toast?.failed ? (
        // A failure stays until it is dismissed, so it isn't missed
        <Snackbar open onClose={() => setToast(null)} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
          <Alert severity="error" variant="filled" onClose={() => setToast(null)}>
            {toast.text}
          </Alert>
        </Snackbar>
      ) : (
        <Snackbar open={!!toast} autoHideDuration={3500} onClose={() => setToast(null)} message={toast?.text} anchorOrigin={{ vertical: "bottom", horizontal: "center" }} />
      )}
    </Box>
  );
}
