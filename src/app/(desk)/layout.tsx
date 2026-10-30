"use client";

import React, { ReactNode, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import { accessOf, refreshMe, signOut, useHydrated, useSession } from "@/lib/auth";
import { apiEnabled } from "@/lib/api";
import { canOpen, homePage, pageLabel } from "@/lib/rbac";
import { DeskProvider } from "@/providers/DeskProvider";
import TopBar from "@/components/shell/TopBar";
import DeskNotice from "@/components/shell/DeskNotice";
import DeskHeader from "@/components/shell/DeskHeader";
import VartamaanMark from "@/components/shell/VartamaanMark";

const outlinedSx = { borderColor: "divider", color: "text.primary" };

export default function DeskLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useHydrated();
  const session = useSession();
  // Demo data: the role's defaults. Backend: what /me said, or null until it has answered
  const access = useMemo(() => (session ? accessOf(session) : null), [session]);
  const signedIn = !!session;
  // Only matters while access is unknown: did the last /me read fail?
  const [meFailed, setMeFailed] = useState(false);

  useEffect(() => {
    if (hydrated && !signedIn) router.replace("/");
  }, [hydrated, signedIn, router]);

  // With the backend, re-read /me on arrival and whenever the tab comes back, so access changed
  // elsewhere (owner console, an admin) shows without signing in again. A 403 also triggers it (lib/api).
  useEffect(() => {
    if (!apiEnabled || !signedIn) return;
    const check = () => refreshMe().then((ok) => setMeFailed(!ok));
    void check();
    const onVisible = () => document.visibilityState === "visible" && void check();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [signedIn]);

  if (!session) return null;

  // A session saved before /me sent pages and permissions: show nothing of the desk until it has
  if (!access) {
    return meFailed ? (
      <Card title="Could not load what your account can open">
        <Typography sx={bodySx}>The desk could not check your access with the server. Try again, or sign out and sign in again.</Typography>
        <Box sx={{ display: "flex", gap: 1, mt: 2.5 }}>
          <Button onClick={() => refreshMe().then((ok) => setMeFailed(!ok))} variant="contained" disableElevation>
            Try again
          </Button>
          <Button onClick={signOut} variant="outlined" sx={outlinedSx}>
            Sign out
          </Button>
        </Box>
      </Card>
    ) : (
      <Box role="status" sx={{ minHeight: "100dvh", display: "grid", placeItems: "center", backgroundColor: "background.default", color: "text.secondary" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, fontSize: "0.8125rem" }}>
          <CircularProgress size={16} color="inherit" />
          Checking your access
        </Box>
      </Box>
    );
  }

  const home = homePage(access);

  // Signed in, but no desk page is switched on for this account: nothing to load, nowhere to go
  if (!home) {
    return (
      <Card title="No desk pages are switched on for you yet">
        <Typography sx={bodySx}>
          You are signed in as {session.username}, but your account cannot open any page of the assignment desk. Ask an admin to give you access{apiEnabled ? "; this screen opens the desk by itself when you come back to this tab after they have" : ""}.
        </Typography>
        <Button onClick={signOut} variant="outlined" sx={{ ...outlinedSx, mt: 2.5 }}>
          Sign out
        </Button>
      </Card>
    );
  }

  return (
    <DeskProvider reviewer={session.username} access={access}>
      <Box sx={{ display: "flex", flexDirection: "column", height: "100dvh", backgroundColor: "background.default", color: "text.primary" }}>
        <TopBar session={session} onLogout={signOut} />
        <Box sx={{ flex: 1, minHeight: 0, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <DeskHeader />
          <Box component="main" sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
            {canOpen(access, pathname) ? children : <BlockedPage label={pageLabel(pathname)} home={home} />}
          </Box>
        </Box>
      </Box>
      <DeskNotice />
    </DeskProvider>
  );
}

const bodySx = { fontSize: "0.8125rem", color: "text.secondary", mt: 0.75, lineHeight: 1.45 };

/** A small centred card for the screens shown instead of the desk */
function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box component="main" sx={{ minHeight: "100dvh", display: "grid", placeItems: "center", p: 2, backgroundColor: "background.default", color: "text.primary" }}>
      <Box sx={{ width: "100%", maxWidth: 400, p: 3, backgroundColor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: "16px" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 2 }}>
          <VartamaanMark size={22} />
          <Typography sx={{ fontSize: "1rem", fontWeight: 600, letterSpacing: "-0.03em" }}>Samvadia</Typography>
        </Box>
        <Typography component="h1" sx={{ fontSize: "0.9375rem", fontWeight: 700 }}>
          {title}
        </Typography>
        {children}
      </Box>
    </Box>
  );
}

/** In place of a page this account cannot open; the tab title says so too */
function BlockedPage({ label, home }: { label: string; home: string }) {
  const title = `${label} is not available for your account`;

  // Next streams its metadata <title> in after hydration, which would undo a one-off document.title,
  // so keep ours applied while this shows and put the page's own back afterwards
  useEffect(() => {
    const wanted = `${title} - Samvadia`;
    const before = document.title === wanted ? "" : document.title;
    const apply = () => {
      if (document.title !== wanted) document.title = wanted;
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => {
      observer.disconnect();
      if (before) document.title = before;
    };
  }, [title]);

  return (
    <Box sx={{ display: "grid", placeItems: "center", height: "100%", px: 2 }}>
      <Box sx={{ textAlign: "center" }}>
        <Typography component="h1" sx={{ fontSize: "0.875rem", fontWeight: 600 }}>
          {title}
        </Typography>
        <Typography sx={{ fontSize: "0.8125rem", color: "text.secondary", mt: 0.5 }}>Ask an admin if you need it.</Typography>
        <Button component={Link} href={home} variant="outlined" sx={{ ...outlinedSx, mt: 1.5 }}>
          Go to {pageLabel(home)}
        </Button>
      </Box>
    </Box>
  );
}
