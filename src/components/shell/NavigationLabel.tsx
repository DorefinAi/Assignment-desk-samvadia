"use client";

// From the digital desk's Overview/NavigationLabel, trimmed to icon logos and
// given a count badge for the inbox.
import { Box, Typography } from "@mui/material";
import React, { ReactNode } from "react";

interface NavigationLabelProps {
  logo: ReactNode;
  label: string;
  isActive?: boolean;
  collapsed?: boolean;
  badge?: number;
}

const NavigationLabel: React.FC<NavigationLabelProps> = ({ logo, label, isActive, collapsed, badge }) => (
  <Box
    sx={{
      position: "relative",
      padding: collapsed ? "9px 0" : "9px 10px",
      margin: "2px 0",
      width: "100%",
      height: "40px",
      display: "flex",
      justifyContent: collapsed ? "center" : "left",
      alignItems: "center",
      backgroundColor: isActive ? "action.selected" : "transparent",
      borderRadius: "8px",
      transition: "background-color 0.15s ease",
      ":hover": { backgroundColor: isActive ? "action.selected" : "action.hover" },
    }}
  >
    <Box
      sx={{
        width: "20px",
        height: "20px",
        mr: collapsed ? 0 : 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: isActive ? "text.primary" : "text.secondary",
        "& svg": { width: 20, height: 20 },
      }}
    >
      {logo}
    </Box>
    {!collapsed && (
      <Typography
        sx={{
          flex: 1,
          color: isActive ? "text.primary" : "text.secondary",
          fontWeight: isActive ? 600 : 400,
          fontSize: "0.875rem",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {label}
      </Typography>
    )}
    {!!badge && (
      <Box
        component="span"
        sx={{
          ...(collapsed ? { position: "absolute", top: 3, right: 6 } : {}),
          minWidth: 18,
          height: 18,
          px: 0.5,
          borderRadius: "9px",
          backgroundColor: "warning.main",
          color: "warning.contrastText",
          fontSize: "0.6875rem",
          fontWeight: 700,
          display: "grid",
          placeItems: "center",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {badge}
      </Box>
    )}
  </Box>
);

export default NavigationLabel;
