"use client";

// Theme shared with the digital desk (same palette, type scale and radii) so the
// two desks feel like one product.
import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";

type ThemeMode = "light" | "dark";

const ThemeContext = createContext<{ mode: ThemeMode; toggleTheme: () => void }>({ mode: "light", toggleTheme: () => {} });

export const useThemeMode = () => useContext(ThemeContext);

export const FONT_STACK = 'var(--font-roboto), var(--font-devanagari), "Nirmala UI", system-ui, sans-serif';

export default function MuiProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>("light");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("themeMode");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restore the saved theme after hydration
      if (saved === "light" || saved === "dark") setMode(saved);
    } catch {
      // Storage blocked; stay on light
    }
  }, []);

  const toggleTheme = () => {
    const next = mode === "light" ? "dark" : "light";
    setMode(next);
    try {
      localStorage.setItem("themeMode", next);
    } catch {
      // Storage blocked; the choice lasts for this visit only
    }
  };

  const light = mode === "light";
  const theme = useMemo(
    () =>
      createTheme({
        // Values and reasons are in DESIGN.md
        palette: {
          mode,
          primary: { main: light ? "#000000" : "#FFFFFF" },
          background: { default: light ? "#F8F9FA" : "#121212", paper: light ? "#FFFFFF" : "#1E1E1E" },
          text: { primary: light ? "#000000" : "#FFFFFF", secondary: light ? "#6D6E6F" : "#B0B0B0" },
          // Accent: waiting on the desk
          warning: { main: light ? "#C2410C" : "#FB923C", contrastText: light ? "#FFFFFF" : "#000000" },
          success: { main: light ? "#2E7D32" : "#81C784" },
          error: { main: light ? "#C62828" : "#EF9A9A", contrastText: light ? "#FFFFFF" : "#000000" },
        },
        typography: {
          fontFamily: FONT_STACK,
          fontSize: 13,
          body1: { fontSize: "0.875rem", lineHeight: 1.45 },
          body2: { fontSize: "0.8125rem", lineHeight: 1.45 },
          button: { fontSize: "0.8125rem", fontWeight: 600 },
        },
        components: {
          MuiCssBaseline: { styleOverrides: { ":root": { "--focus-ring": light ? "#000000" : "#FFFFFF" } } },
          MuiTypography: { styleOverrides: { root: { marginBottom: 0 } } },
          MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { borderRadius: "12px", textTransform: "none", minHeight: 36, fontSize: "0.8125rem" } } },
          MuiInputBase: { styleOverrides: { root: { fontSize: "0.875rem" } } },
          MuiOutlinedInput: { styleOverrides: { root: { borderRadius: "8px" } } },
          MuiPaper: { styleOverrides: { root: { borderRadius: "12px", backgroundImage: "none" } } },
          MuiPopover: { styleOverrides: { paper: { boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)" } } },
          MuiMenu: { styleOverrides: { paper: { boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)", borderRadius: "8px" } } },
          MuiTooltip: { styleOverrides: { tooltip: { fontSize: "0.75rem" } } },
        },
      }),
    [mode, light]
  );

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
}
