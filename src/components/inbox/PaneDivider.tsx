"use client";

// The line between the chat list and the open message. Drag it, or focus it and use the arrow keys.
// Double-click puts it back to the default width.
import React, { useRef } from "react";
import { Box } from "@mui/material";
import { useChatColors } from "./chatTheme";

interface PaneDividerProps {
  /** Width of the pane on the left, in px */
  value: number;
  min: number;
  max: number;
  onChange: (width: number) => void;
  onReset: () => void;
}

const STEP = 16;

export default function PaneDivider({ value, min, max, onChange, onReset }: PaneDividerProps) {
  const c = useChatColors();
  const drag = useRef<{ x: number; width: number } | null>(null);
  const clamp = (w: number) => Math.round(Math.min(max, Math.max(min, w)));

  return (
    <Box
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize the chat list"
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      onPointerDown={(e) => {
        drag.current = { x: e.clientX, width: value };
        e.currentTarget.setPointerCapture(e.pointerId);
        document.body.style.userSelect = "none";
      }}
      onPointerMove={(e) => drag.current && onChange(clamp(drag.current.width + e.clientX - drag.current.x))}
      onPointerUp={(e) => {
        drag.current = null;
        e.currentTarget.releasePointerCapture(e.pointerId);
        document.body.style.userSelect = "";
      }}
      onDoubleClick={onReset}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") onChange(clamp(value - STEP));
        else if (e.key === "ArrowRight") onChange(clamp(value + STEP));
        else if (e.key === "Home") onChange(min);
        else if (e.key === "End") onChange(max);
        else return;
        e.preventDefault();
      }}
      sx={{
        position: "relative",
        cursor: "col-resize",
        touchAction: "none",
        outline: "none",
        // 1px line, a wider invisible grab area around it
        "&::before": { content: '""', position: "absolute", top: 0, bottom: 0, left: "50%", width: "1px", transform: "translateX(-50%)", backgroundColor: "divider", transition: "background-color 0.15s, width 0.15s" },
        "&:hover::before, &:active::before, &:focus-visible::before": { width: "3px", backgroundColor: c.unread },
      }}
    />
  );
}
