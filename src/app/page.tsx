"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Button, IconButton, MenuItem, TextField, Typography } from "@mui/material";
import { FolderTree, Inbox, Moon, Rss, Send, Sun } from "lucide-react";
import { accessOf, signIn, signInWithApi, useSession } from "@/lib/auth";
import { API_URL, apiEnabled } from "@/lib/api";
import VartamaanMark from "@/components/shell/VartamaanMark";
import { useThemeMode } from "@/providers/MuiProvider";
import { homePage, Role, ROLE_META, ROLES } from "@/lib/rbac";

// Same look as the digital desk's sign-in (near-black / near-white surfaces, one raised card),
// with the assignment desk's own accent (the orange used for "waiting on the desk") in place of red.
// Status colours are darker in light mode to keep AA contrast.
const PALETTES = {
  dark: {
    bg: "#08090b",
    card: "#111216",
    field: "rgba(255,255,255,0.03)",
    tile: "rgba(255,255,255,0.06)",
    hair: "rgba(255,255,255,0.08)",
    hair2: "rgba(255,255,255,0.14)",
    hairHover: "rgba(255,255,255,0.3)",
    ink: "#f4f5f7",
    ink2: "#a9acb5",
    ink3: "#80838d",
    btnHover: "#ffffff",
    btnDisabled: "rgba(255,255,255,0.12)",
    cardShadow: "0 40px 80px -40px rgba(0,0,0,0.9)",
    error: "#ff6b5e",
    wire: "#c2410c",
    working: "#fb923c",
    done: "#3fe0a5",
  },
  light: {
    bg: "#f6f6f7",
    card: "#ffffff",
    field: "#ffffff",
    tile: "rgba(0,0,0,0.05)",
    hair: "rgba(0,0,0,0.08)",
    hair2: "rgba(0,0,0,0.16)",
    hairHover: "rgba(0,0,0,0.35)",
    ink: "#0b0c0f",
    ink2: "#4b4e56",
    ink3: "#686b73",
    btnHover: "#2a2c32",
    btnDisabled: "rgba(0,0,0,0.08)",
    cardShadow: "0 30px 60px -36px rgba(0,0,0,0.25)",
    error: "#c62828",
    wire: "#c2410c",
    working: "#c2410c",
    done: "#047857",
  },
};

const EASE = "cubic-bezier(0.23, 1, 0.32, 1)";

// Laptops under ~840px tall: the rundown folds into one row of four instead of a list
const SHORT_DESKTOP = "@media (min-width: 900px) and (max-height: 839.95px)";

// What the desk does with one story, in order
const RUNDOWN = [
  { name: "Inbox", detail: "WhatsApp and Outlook in one place", Icon: Inbox },
  { name: "Slug", detail: "Slug and FTP folder made for you", Icon: FolderTree },
  { name: "Approved", detail: "The desk decides once", Icon: Send },
  { name: "Octopus", detail: "Sent on by the RSS feed", Icon: Rss },
];

const STAGES = [
  { label: "Waiting", tone: "ink3" },
  { label: "Working", tone: "working" },
  { label: "Done", tone: "done" },
] as const;

// Rundown plays once: each step moves Waiting -> Working -> Done, a step behind the one above
const FINAL_STEP = RUNDOWN.length - 1 + STAGES.length - 1;

const TICKER = [
  "WhatsApp and Outlook in one inbox",
  "Slug and FTP folder made for you",
  "Approved stories go to Octopus by RSS",
  "Assign a story to a reporter from the desk",
];

// Entrance: header, headline, form, rundown, ticker rise in that order
const rise = (step: number) => ({
  animation: `loginRise 0.7s ${EASE} both`,
  animationDelay: `${0.05 + step * 0.08}s`,
});

const istTime = () =>
  new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" });

export default function LoginPage() {
  const router = useRouter();
  const session = useSession();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  // Demo data only: the role is picked here so each view can be tried. With the backend, the account decides it.
  const [role, setRole] = useState<Role>("assignment_desk");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [clock, setClock] = useState("");
  const { mode, toggleTheme } = useThemeMode();
  const C = PALETTES[mode];

  useEffect(() => {
    // First page this account may open (not everyone has the overview); the desk explains if there is none
    if (!session) return;
    const access = accessOf(session);
    router.replace((access && homePage(access)) ?? "/dashboard");
  }, [session, router]);

  // IST clock and the one-time rundown; both start after hydration so the server HTML matches
  useEffect(() => {
    const first = setTimeout(() => {
      setClock(istTime());
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setStep(FINAL_STEP);
    }, 0);
    const clockTimer = setInterval(() => setClock(istTime()), 15000);
    let rundownTimer: ReturnType<typeof setInterval> | undefined;
    const start = setTimeout(() => {
      rundownTimer = setInterval(() => {
        setStep((s) => {
          if (s + 1 >= FINAL_STEP && rundownTimer) clearInterval(rundownTimer);
          return Math.min(s + 1, FINAL_STEP);
        });
      }, 650);
    }, 900);
    return () => {
      clearTimeout(first);
      clearTimeout(start);
      clearInterval(clockTimer);
      if (rundownTimer) clearInterval(rundownTimer);
    };
  }, []);

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

  const fieldSx = {
    "& .MuiOutlinedInput-root": {
      borderRadius: "12px",
      bgcolor: C.field,
      color: C.ink,
      // The desk theme sets 0.875rem for dense tables; the sign-in uses full-size fields
      fontSize: "1rem",
      "& fieldset": { borderColor: C.hair2 },
      "&:hover fieldset": { borderColor: C.hairHover },
      "&.Mui-focused fieldset": { borderColor: C.ink, borderWidth: "1px" },
    },
    "& .MuiInputLabel-root": { color: C.ink3, fontSize: "1rem" },
    "& .MuiInputLabel-root.Mui-focused": { color: C.ink },
    "& .MuiSelect-icon": { color: C.ink3 },
    "& .MuiFormHelperText-root": { color: C.ink3, mx: 0.5 },
    "& input:-webkit-autofill": {
      WebkitBoxShadow: `0 0 0 100px ${C.card} inset`,
      WebkitTextFillColor: C.ink,
      caretColor: C.ink,
    },
  };

  return (
    <Box
      sx={{
        // Exactly one screen tall, so the login never scrolls. The extras drop out as the screen gets
        // shorter; only a screen too short for the card (a phone on its side) lets the middle scroll,
        // so Sign in is always reachable.
        height: "100dvh",
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr)",
        gridTemplateRows: "auto minmax(0, 1fr) auto",
        bgcolor: C.bg,
        color: C.ink,
        overflow: "hidden",
        "@keyframes loginRise": { from: { opacity: 0, transform: "translateY(14px)" }, to: { opacity: 1, transform: "none" } },
        "@keyframes loginTicker": { from: { transform: "translateX(0)" }, to: { transform: "translateX(-50%)" } },
        "@media (prefers-reduced-motion: reduce)": { "& *": { animation: "none !important", transition: "none !important" } },
      }}
    >
      {/* Top bar */}
      <Box
        component="header"
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          px: { xs: 2, sm: 4, md: 6 },
          py: { xs: 2, md: 3 },
          "@media (max-height: 759.95px)": { py: 1.25 },
          ...rise(0),
        }}
      >
        <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1.25, minWidth: 0 }}>
          <VartamaanMark size={28} />
          <Typography component="span" sx={{ fontSize: "1.375rem", fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.15 }}>
            Samvadia
          </Typography>
          <Typography component="span" noWrap sx={{ fontSize: "0.8125rem", color: C.ink3, display: { xs: "none", sm: "inline" } }}>
            Assignment desk
          </Typography>
        </Box>
        <Box sx={{ display: "inline-flex", alignItems: "center", gap: { xs: 1, sm: 2 } }}>
          <Typography component="span" sx={{ fontSize: "0.8125rem", color: C.ink3, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
            {clock && `${clock} IST`}
          </Typography>
          <IconButton
            onClick={toggleTheme}
            aria-label={mode === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            sx={{
              width: 44,
              height: 44,
              color: C.ink2,
              border: `1px solid ${C.hair2}`,
              borderRadius: "12px",
              "&:hover": { color: C.ink, bgcolor: C.tile },
              "&.Mui-focusVisible": { outline: `2px solid ${C.ink}`, outlineOffset: 2 },
            }}
          >
            {mode === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </IconButton>
        </Box>
      </Box>

      {/* Phone: headline, form stacked. Tablet: headline across, form and rundown side by side. Desktop: pitch left, form right */}
      <Box
        component="main"
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "minmax(0, 1.15fr) minmax(340px, 420px)" },
          gridTemplateAreas: { xs: '"pitch" "form" "rundown"', md: '"pitch form" "rundown form"' },
          "@media (min-width: 700px) and (max-width: 899.95px)": {
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
            gridTemplateAreas: '"pitch pitch" "form rundown"',
            columnGap: 3,
            alignItems: "start",
          },
          // "safe" keeps the top reachable when the stack is taller than the screen
          alignContent: "safe center",
          columnGap: { md: 6, lg: 12 },
          rowGap: { xs: 3, sm: 4, md: 5 },
          width: "100%",
          maxWidth: 1200,
          mx: "auto",
          px: { xs: 2, sm: 4, md: 6 },
          pt: { xs: 1, md: 4 },
          pb: { xs: 4, md: 6 },
          minHeight: 0,
          overflowY: "auto",
          "@media (max-height: 759.95px)": { pt: 0, pb: 2, rowGap: 2 },
          "@media (max-height: 699.95px)": { pb: 1.5, rowGap: 1.5 },
        }}
      >
        <Box sx={{ gridArea: "pitch", minWidth: 0, alignSelf: { md: "end" } }}>
          <Typography
            component="h1"
            sx={{
              // Sized by height as well as width, so a short laptop screen gets a shorter headline
              fontSize: "clamp(2rem, min(1.2rem + 4.6vw, 8.5vh), 4.5rem)",
              "@media (max-height: 699.95px)": { fontSize: "clamp(2rem, min(1.2rem + 4.6vw, 7vh), 4.5rem)" },
              lineHeight: 1,
              fontWeight: 700,
              letterSpacing: "-0.04em",
              m: 0,
              ...rise(1),
            }}
          >
            Every source.
            <Box component="span" sx={{ display: "block", color: C.ink3 }}>
              One desk.
            </Box>
          </Typography>
          <Typography
            sx={{
              mt: { xs: 1.5, md: 3 },
              maxWidth: 500,
              fontSize: "clamp(0.9375rem, 0.88rem + 0.25vw, 1.0625rem)",
              lineHeight: 1.6,
              color: C.ink2,
              ...rise(2),
              // The headline says enough when the screen is very short
              // (phones up to 899px tall: the demo role field makes the card taller than the digital desk's)
              "@media (max-height: 599.95px), (max-width: 899.95px) and (max-height: 699.95px), (max-width: 699.95px) and (max-height: 899.95px)": { display: "none" },
            }}
          >
            Samvadia brings WhatsApp and Outlook into one inbox for the 1st India News assignment desk, makes the slug and FTP
            folder, and sends approved stories to Octopus by RSS.
          </Typography>
        </Box>

        {/* Sign-in card: the one raised surface on the page */}
        <Box
          component="form"
          onSubmit={handleSubmit}
          noValidate
          sx={{
            gridArea: "form",
            alignSelf: "center",
            width: "100%",
            maxWidth: { xs: 480, md: "none" },
            "@media (min-width: 700px)": { maxWidth: "none" },
            p: { xs: 2.5, sm: 4 },
            "@media (max-height: 699.95px)": { p: 2.5, gap: 2 },
            borderRadius: "20px",
            border: `1px solid ${C.hair2}`,
            bgcolor: C.card,
            boxShadow: C.cardShadow,
            display: "flex",
            flexDirection: "column",
            gap: 2.25,
            ...rise(3),
          }}
        >
          <Box>
            <Typography component="h2" sx={{ fontSize: "1.375rem", fontWeight: 700, letterSpacing: "-0.02em", m: 0, color: C.ink }}>
              Sign in to the desk
            </Typography>
            <Typography sx={{ mt: 0.75, color: C.ink2, fontSize: "0.875rem" }}>
              {apiEnabled ? "Use your newsroom account." : "Demo data: pick a role to try each view."}
            </Typography>
          </Box>

          <TextField label="Username" autoFocus autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} fullWidth sx={fieldSx} />
          <TextField label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} fullWidth sx={fieldSx} />
          {!apiEnabled && (
            <TextField select label="Role (demo)" value={role} onChange={(e) => setRole(e.target.value as Role)} fullWidth helperText={ROLE_META[role].description} sx={fieldSx}>
              {ROLES.map((r) => (
                <MenuItem key={r} value={r}>
                  {ROLE_META[r].label}
                </MenuItem>
              ))}
            </TextField>
          )}
          {error && (
            <Typography role="alert" sx={{ fontSize: "0.8125rem", fontWeight: 600, color: C.error }}>
              {error}
            </Typography>
          )}
          <Button
            type="submit"
            fullWidth
            disabled={busy}
            sx={{
              mt: 0.5,
              minHeight: 50,
              borderRadius: "12px",
              bgcolor: C.ink,
              color: C.bg,
              fontSize: "0.9375rem",
              fontWeight: 700,
              textTransform: "none",
              transition: `transform 0.16s ${EASE}, background-color 0.16s ${EASE}`,
              "&:hover": { bgcolor: C.btnHover },
              "&:active": { transform: "scale(0.98)" },
              "&.Mui-focusVisible": { outline: `2px solid ${C.ink}`, outlineOffset: 3 },
              "&.Mui-disabled": { bgcolor: C.btnDisabled, color: C.ink3 },
            }}
          >
            {busy ? "Signing in…" : "Sign in"}
          </Button>
          <Typography sx={{ textAlign: "center", color: C.ink3, fontSize: "0.8125rem" }}>No account yet? Ask your desk admin for access.</Typography>
        </Box>

        {/* How one story moves through the desk: plays once on load, then rests on Done */}
        <Box sx={{ gridArea: "rundown", minWidth: 0, alignSelf: { md: "start" }, ...rise(4), "@media (max-width: 699.95px)": { display: "none" } }}>
          <Box
            role="img"
            aria-label="One story moving from the inbox to a slug, approval and Octopus"
            sx={{
              maxWidth: { xs: 480, md: 500 },
              "@media (min-width: 700px) and (max-width: 899.95px)": { maxWidth: "none" },
              borderRadius: "16px",
              border: `1px solid ${C.hair}`,
              overflow: "hidden",
              [SHORT_DESKTOP]: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(96px, 1fr))" },
            }}
          >
            <Typography
              sx={{ px: 2, py: 1.25, borderBottom: `1px solid ${C.hair}`, fontSize: "0.8125rem", fontWeight: 600, color: C.ink2, [SHORT_DESKTOP]: { gridColumn: "1 / -1" } }}
            >
              One story, inbox to Octopus
            </Typography>
            {RUNDOWN.map(({ name, detail, Icon }, i) => {
              const stage = STAGES[Math.max(0, Math.min(step - i, STAGES.length - 1))];
              const stageColor = C[stage.tone];
              return (
                <Box
                  key={name}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "32px minmax(0, 1fr) auto",
                    alignItems: "center",
                    gap: 1.5,
                    px: 2,
                    py: 1.25,
                    "& + &": { borderTop: `1px solid ${C.hair}` },
                    [SHORT_DESKTOP]: {
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      gap: 1,
                      px: 1.5,
                      "& + &": { borderTop: 0, borderLeft: `1px solid ${C.hair}` },
                    },
                  }}
                >
                  <Box sx={{ width: 32, height: 32, borderRadius: "8px", display: "grid", placeItems: "center", bgcolor: C.tile }}>
                    <Icon size={17} aria-hidden />
                  </Box>
                  <Box sx={{ minWidth: 0, maxWidth: "100%" }}>
                    <Typography noWrap sx={{ fontSize: "0.875rem", fontWeight: 600 }}>
                      {name}
                    </Typography>
                    <Typography noWrap sx={{ fontSize: "0.75rem", color: C.ink3, [SHORT_DESKTOP]: { display: "none" } }}>
                      {detail}
                    </Typography>
                  </Box>
                  <Box
                    key={stage.label}
                    sx={{ display: "inline-flex", alignItems: "center", gap: 0.75, fontSize: "0.75rem", fontWeight: 600, color: stageColor, animation: `loginRise 0.4s ${EASE} both` }}
                  >
                    <Box component="span" sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: stageColor }} />
                    {stage.label}
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>
      </Box>

      {/* Wire ticker, the newsroom's own idiom */}
      <Box component="footer" sx={{ ...rise(5), "@media (max-height: 459.95px)": { display: "none" } }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "stretch",
            borderTop: `1px solid ${C.hair}`,
            borderBottom: `1px solid ${C.hair}`,
            overflow: "hidden",
            "&:hover .login-ticker": { animationPlayState: "paused" },
          }}
        >
          <Box sx={{ flexShrink: 0, display: "flex", alignItems: "center", px: { xs: 1.5, sm: 2 }, bgcolor: C.wire, color: "#fff", fontSize: "0.75rem", fontWeight: 800, letterSpacing: "0.04em" }}>
            Desk wire
          </Box>
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              overflow: "hidden",
              maskImage: "linear-gradient(90deg, transparent, #000 4%, #000 96%, transparent)",
              WebkitMaskImage: "linear-gradient(90deg, transparent, #000 4%, #000 96%, transparent)",
            }}
          >
            <Box className="login-ticker" sx={{ display: "flex", width: "max-content", py: 1.25, animation: "loginTicker 40s linear infinite" }}>
              {/* Two copies so the loop is seamless; each copy is the list twice so it is wider than a desktop screen */}
              {[...TICKER, ...TICKER, ...TICKER, ...TICKER].map((line, i) => (
                <Box
                  key={i}
                  component="span"
                  aria-hidden={i >= TICKER.length}
                  sx={{ display: "inline-flex", alignItems: "center", gap: 3, pr: 3, fontSize: "0.8125rem", color: C.ink2, whiteSpace: "nowrap" }}
                >
                  {line}
                  <Box component="span" sx={{ width: 4, height: 4, borderRadius: "50%", bgcolor: C.ink3 }} />
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
        <Typography sx={{ textAlign: "center", py: 1.75, px: 2, color: C.ink3, fontSize: "0.75rem", "@media (max-height: 759.95px)": { py: 1 } }}>
          Samvadia · Assignment desk · 1st India News
        </Typography>
      </Box>
    </Box>
  );
}
