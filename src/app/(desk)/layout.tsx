"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Box, Button } from "@mui/material";
import { signOut, useHydrated, useSession } from "@/lib/auth";
import { can, ROLE_META, ROUTE_PERMISSION } from "@/lib/rbac";
import { DeskProvider } from "@/providers/DeskProvider";
import TopBar from "@/components/shell/TopBar";
import DeskNotice from "@/components/shell/DeskNotice";
import DeskHeader from "@/components/shell/DeskHeader";
import { EmptyState } from "@/components/common/shared";

export default function DeskLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useHydrated();
  const session = useSession();

  useEffect(() => {
    if (hydrated && !session) router.replace("/");
  }, [hydrated, session, router]);

  if (!session) return null;

  const needed = ROUTE_PERMISSION[pathname];
  const allowed = !needed || can(session.role, needed);

  return (
    <DeskProvider reviewer={session.username} role={session.role}>
      <Box sx={{ display: "flex", flexDirection: "column", height: "100dvh", backgroundColor: "background.default", color: "text.primary" }}>
        <TopBar session={session} onLogout={signOut} />
        <Box sx={{ flex: 1, minHeight: 0, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <DeskHeader session={session} />
          <Box component="main" sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
            {allowed ? (
              children
            ) : (
              <Box sx={{ display: "grid", placeItems: "center", height: "100%", gap: 1 }}>
                <Box sx={{ textAlign: "center" }}>
                  <EmptyState title="You don't have access to this page" hint={`${ROLE_META[session.role].label} can't open it. Ask an admin if you need it.`} />
                  <Button component={Link} href="/dashboard" variant="outlined" sx={{ borderColor: "divider", color: "text.primary" }}>
                    Go to overview
                  </Button>
                </Box>
              </Box>
            )}
          </Box>
        </Box>
      </Box>
      <DeskNotice />
    </DeskProvider>
  );
}
