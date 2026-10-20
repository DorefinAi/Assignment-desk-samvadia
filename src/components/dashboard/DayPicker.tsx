"use client";

// The overview's date control: a button that opens a month calendar. Days that
// had intake carry a dot; days after today can't be picked.
import React, { useState } from "react";
import { Box, Button, ButtonBase, IconButton, Popover, Typography } from "@mui/material";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

const pad = (n: number) => String(n).padStart(2, "0");
const key = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const parse = (day: string) => {
  const [y, m, d] = day.split("-").map(Number);
  return { y, m: m - 1, d };
};
const monthName = (y: number, m: number) => new Date(y, m, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
const buttonLabel = (day: string) => new Date(`${day}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

interface DayPickerProps {
  /** yyyy-mm-dd */
  value: string;
  /** Last day that can be picked (today) */
  max: string;
  onChange: (day: string) => void;
  /** Days that had intake */
  marked?: Set<string>;
}

export default function DayPicker({ value, max, onChange, marked }: DayPickerProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [view, setView] = useState(() => parse(value));
  const today = parse(max);

  const open = (e: React.MouseEvent<HTMLElement>) => {
    setView(parse(value));
    setAnchor(e.currentTarget);
  };
  const pick = (day: string) => {
    onChange(day);
    setAnchor(null);
  };
  const shift = (by: number) => setView((v) => ({ ...v, ...normalise(v.y, v.m + by) }));
  const atLatestMonth = view.y > today.y || (view.y === today.y && view.m >= today.m);

  // Monday-first grid with leading blanks
  const lead = (new Date(view.y, view.m, 1).getDay() + 6) % 7;
  const days = new Date(view.y, view.m + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];

  return (
    <>
      <Button
        onClick={open}
        aria-haspopup="dialog"
        aria-expanded={!!anchor}
        startIcon={<CalendarDays size={15} />}
        endIcon={<ChevronDown size={14} style={{ transform: anchor ? "rotate(180deg)" : undefined, transition: "transform 0.15s" }} />}
        sx={{ height: 34, px: 1.5, border: "1px solid", borderColor: anchor ? "text.primary" : "divider", borderRadius: "10px", backgroundColor: "background.paper", color: "text.primary", fontWeight: 600, "&:hover": { backgroundColor: "action.hover" } }}
      >
        {buttonLabel(value)}
      </Button>

      <Popover
        open={!!anchor}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { mt: 1, p: 1.5, width: 296, border: "1px solid", borderColor: "divider", borderRadius: "14px" }, role: "dialog", "aria-label": "Pick a date" } }}
      >
        <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
          <IconButton size="small" onClick={() => shift(-1)} aria-label="Previous month">
            <ChevronLeft size={16} />
          </IconButton>
          <Typography aria-live="polite" sx={{ flex: 1, textAlign: "center", fontSize: "0.875rem", fontWeight: 700 }}>
            {monthName(view.y, view.m)}
          </Typography>
          <IconButton size="small" onClick={() => shift(1)} disabled={atLatestMonth} aria-label="Next month">
            <ChevronRight size={16} />
          </IconButton>
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", rowGap: 0.25 }}>
          {WEEKDAYS.map((w) => (
            <Typography key={w} sx={{ textAlign: "center", fontSize: "0.6875rem", fontWeight: 600, color: "text.secondary", py: 0.5 }}>
              {w}
            </Typography>
          ))}
          {cells.map((d, i) => {
            if (d === null) return <Box key={`blank-${i}`} />;
            const day = key(view.y, view.m, d);
            const selected = day === value;
            const isToday = day === max;
            const future = day > max;
            const hasNews = marked?.has(day);
            return (
              <ButtonBase
                key={day}
                onClick={() => pick(day)}
                disabled={future}
                aria-pressed={selected}
                aria-label={`${new Date(view.y, view.m, d).toLocaleDateString("en-IN", { day: "numeric", month: "long" })}${hasNews ? ", has intake" : ""}`}
                sx={{
                  position: "relative",
                  justifySelf: "center",
                  width: 36,
                  height: 36,
                  borderRadius: "10px",
                  fontFamily: "inherit",
                  fontSize: "0.8125rem",
                  fontWeight: selected || isToday ? 700 : 500,
                  fontVariantNumeric: "tabular-nums",
                  color: selected ? "background.paper" : future ? "text.disabled" : "text.primary",
                  backgroundColor: selected ? "text.primary" : "transparent",
                  boxShadow: isToday && !selected ? "inset 0 0 0 1px currentColor" : "none",
                  "&:hover": { backgroundColor: selected ? "text.primary" : "action.hover" },
                  "&.Mui-focusVisible": { outline: "2px solid var(--focus-ring)", outlineOffset: 1 },
                }}
              >
                {d}
                {hasNews && <Box component="span" sx={{ position: "absolute", bottom: 4, width: 4, height: 4, borderRadius: "50%", backgroundColor: selected ? "background.paper" : "text.secondary" }} />}
              </ButtonBase>
            );
          })}
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 1, pt: 1, borderTop: "1px solid", borderColor: "divider" }}>
          <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.75, fontSize: "0.6875rem", color: "text.secondary" }}>
            <Box component="span" sx={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "text.secondary" }} />
            Had intake
          </Box>
          <Button size="small" onClick={() => pick(max)} disabled={value === max} sx={{ minHeight: 28, color: "text.primary" }}>
            Today
          </Button>
        </Box>
      </Popover>
    </>
  );
}

function normalise(y: number, m: number) {
  const d = new Date(y, m, 1);
  return { y: d.getFullYear(), m: d.getMonth() };
}
