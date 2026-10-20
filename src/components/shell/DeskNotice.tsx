"use client";

// What the backend refused or failed at ("This story is already approved."), shown once at the bottom.
import React from "react";
import { Alert, Snackbar } from "@mui/material";
import { useDesk } from "@/providers/DeskProvider";

export default function DeskNotice() {
  const { notice, dismissNotice } = useDesk();
  return (
    <Snackbar open={!!notice} onClose={(_, why) => why !== "clickaway" && dismissNotice()} autoHideDuration={8000} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
      <Alert severity="warning" variant="filled" onClose={dismissNotice} sx={{ maxWidth: 560, fontSize: "0.8125rem" }}>
        {notice}
      </Alert>
    </Snackbar>
  );
}
