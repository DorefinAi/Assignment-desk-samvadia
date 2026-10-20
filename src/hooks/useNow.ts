"use client";

import { useEffect, useState } from "react";

/** Current time in ms, refreshed every `intervalMs`. Drives "checked 12s ago" style labels. */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}
