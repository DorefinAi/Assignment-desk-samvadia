"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Button, MenuItem, TextField, Typography } from "@mui/material";
import { Inbox, FolderTree, Rss } from "lucide-react";
import { signIn, signInWithApi, useSession } from "@/lib/auth";
import { API_URL, apiEnabled } from "@/lib/api";
import VartamaanMark from "@/components/shell/VartamaanMark";
import { Role, ROLE_META, ROLES } from "@/lib/rbac";

const FLOW = [
  { Icon: Inbox, text: "WhatsApp and Outlook in one inbox" },
  { Icon: FolderTree, text: "Slug and FTP folder made for you" },
  { Icon: Rss, text: "Approved stories go to Octopus by RSS" },
];

export default function LoginPage() {
  const router = useRouter();
  const session = useSession();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  // Demo data only: the role is picked here so each view can be tried. With the backend, the account decides it.
  const [role, setRole] = useState<Role>("assignment_desk");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session) router.replace("/dashboard");
  }, [session, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("Enter your username and password.");
      return;
    }
    if (!apiEnabled) {
      signIn(username.trim(), role);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await signInWithApi(API_URL, username.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  };

  return (
    // Exactly one screen tall, so the login never scrolls; only a screen too short for the form
    // (a phone on its side) lets it scroll, so Sign in is always reachable
    <Box component="main" sx={{ height: "100dvh", overflowY: "auto", display: "grid", placeItems: "center", p: 2, backgroundColor: "background.default" }}>
      <Box sx={{ width: "100%", maxWidth: 400, my: "auto" }}>
        <Box sx={{ mb: 3, display: "flex", alignItems: "center", gap: 1.5, "@media (max-height: 459.95px)": { mb: 1.5 } }}>
          <VartamaanMark size={30} />
          <Box>
            <Typography sx={{ fontSize: "1.375rem", fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.15 }}>Samvadia</Typography>
            <Typography sx={{ fontSize: "0.875rem", color: "text.secondary" }}>Assignment desk · 1st India News</Typography>
          </Box>
        </Box>

        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ p: 3, backgroundColor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: "16px", display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField label="Username" autoFocus autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} size="small" fullWidth />
          <TextField label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} size="small" fullWidth />
          {!apiEnabled && (
            <TextField select label="Role (demo)" value={role} onChange={(e) => setRole(e.target.value as Role)} size="small" fullWidth helperText={ROLE_META[role].description}>
              {ROLES.map((r) => (
                <MenuItem key={r} value={r}>
                  {ROLE_META[r].label}
                </MenuItem>
              ))}
            </TextField>
          )}
          {error && (
            <Typography role="alert" sx={{ fontSize: "0.8125rem", color: "error.main" }}>
              {error}
            </Typography>
          )}
          <Button type="submit" variant="contained" disableElevation disabled={busy} sx={{ minHeight: 42 }}>
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </Box>

        <Box component="ul" sx={{ listStyle: "none", p: 0, m: 0, mt: 3, display: "flex", flexDirection: "column", gap: 1, "@media (max-height: 599.95px)": { display: "none" } }}>
          {FLOW.map(({ Icon, text }) => (
            <Box component="li" key={text} sx={{ display: "flex", alignItems: "center", gap: 1, fontSize: "0.8125rem", color: "text.secondary" }}>
              <Icon size={15} aria-hidden />
              {text}
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
