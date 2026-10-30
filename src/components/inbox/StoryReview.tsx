"use client";

// One conversation, laid out like the app it came from: a header bar, the message (a WhatsApp
// bubble or an Outlook email) and a bar with the decision. "Edit story" swaps the message for
// the Story editor, so the screen stays two panes: the list and whichever one you are working in.
import React, { useState } from "react";
import Link from "next/link";
import { Badge, Box, Button, CircularProgress, IconButton, Popover, SxProps, Theme, Tooltip, Typography } from "@mui/material";
import { ArrowLeft, Check, FolderTree, Pencil, RotateCcw, Rss, Sparkles, X } from "lucide-react";
import { useDesk } from "@/providers/DeskProvider";
import { useCan } from "@/hooks/useCan";
import { IntakeItem } from "@/types/desk";
import { slugError } from "@/lib/slug";
import FolderDialog from "@/components/ftp/FolderDialog";
import AiPanel from "./AiPanel";
import ChatAvatar from "./ChatAvatar";
import { EmailMessage, MAIL_INDENT, WhatsAppMessage } from "./OriginalMessage";
import StoryEditor from "./StoryEditor";
import RejectDialog from "./RejectDialog";
import FootagePanel from "./FootagePanel";
import FtpPickerDialog from "./FtpPickerDialog";
import { useChatColors } from "./chatTheme";

interface StoryReviewProps {
  item: IntakeItem;
  onBack?: () => void;
  /** The Story editor is showing; kept by the page so it stays open from one message to the next */
  editing: boolean;
  onEditing: (open: boolean) => void;
  /** Called after Approve or Reject, so the page can move on to the next story */
  onDecided?: () => void;
}

/** "TODAY", "YESTERDAY" or "17 OCT 2026", for the date tag above the message */
function dayPill(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function StoryReview({ item, onBack, editing, onEditing, onDecided }: StoryReviewProps) {
  const desk = useDesk();
  const c = useChatColors();
  const [rejecting, setRejecting] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [picking, setPicking] = useState(false);
  const [aiAnchor, setAiAnchor] = useState<HTMLElement | null>(null);
  const canReview = useCan("intake.review");
  const canRename = useCan("ftp.rename");
  const canManageFeed = useCan("feed.manage");
  const canSeeFtp = useCan("ftp.view");
  const canPickFootage = useCan("intake.footage");

  const folder = desk.folders.find((f) => f.id === item.folderId);
  const entry = desk.feed.find((e) => e.itemId === item.id);
  const downloading = item.attachments.filter((a) => a.state === "downloading").length;
  const failed = item.attachments.filter((a) => a.state === "failed").length;
  const problem = !item.draft.slug && item.intakeNote ? item.intakeNote : !item.draft.headline.trim() ? "Add a headline first." : slugError(item.draft.slug, item.draft.locationCode) ? "Fix the slug first." : downloading ? `Waiting for ${downloading} ${downloading === 1 ? "file" : "files"} to download.` : null;
  const busy = item.stage === "filing" || item.stage === "filed";
  const email = item.source === "outlook";

  // WhatsApp Web's date tag and its yellow notice strip; an email shows the same notices as a Gmail-style banner
  const dateTagSx: SxProps<Theme> = { alignSelf: "center", px: 1.25, py: 0.875, borderRadius: "5px", backgroundColor: c.dateTag, color: c.dateTagText, fontSize: "0.75rem", fontWeight: 500, textTransform: "uppercase", boxShadow: "0 1px 0.5px rgba(11, 20, 26, 0.13)" };
  const noticeSx: SxProps<Theme> = email
    ? { px: 2, py: 1.25, mb: 2, borderRadius: "8px", backgroundColor: c.mailTile, fontSize: "0.8125rem", ml: MAIL_INDENT }
    : { alignSelf: "center", maxWidth: 560, px: 1.25, py: 0.625, borderRadius: "5px", backgroundColor: c.notice, color: c.noticeText, fontSize: "0.77rem", lineHeight: "20px", textAlign: "center" };
  const note = { fontSize: "0.75rem", color: email ? c.mailMeta : c.meta };
  const quietButtonSx = { borderColor: "divider", color: "text.primary", backgroundColor: email ? "transparent" : c.bubble };
  const onRetry = canReview ? (id: string) => desk.retryDownload(item.id, id) : undefined;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0, minWidth: 0 }}>
      {/* Conversation header. An email already names its sender, so on wide screens it has none, except while editing. */}
      {(!email || editing) && (
        <Box sx={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 1.5, height: 60, px: 2, backgroundColor: c.bar, borderBottom: "1px solid", borderColor: c.line }}>
          {onBack && (
            <IconButton onClick={onBack} aria-label="Back to intake" sx={{ ml: -1 }}>
              <ArrowLeft size={18} />
            </IconButton>
          )}
          <ChatAvatar item={item} size={40} />
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography noWrap sx={{ fontSize: "0.9375rem", fontWeight: 600 }}>{editing ? "Story" : (item.chat ?? item.sender.name)}</Typography>
            <Typography noWrap sx={note}>{editing ? `From ${item.sender.name}` : item.chat ? `${item.sender.name}, ${item.sender.contact}` : item.sender.contact}</Typography>
          </Box>
          {editing && (
            <>
              {/* AI suggestions for the story; a dot when the model flagged something (duplicate, check before air) */}
              {item.ai.headlines.length > 0 && !item.blind && (
              <Tooltip title="AI suggestions">
                <IconButton onClick={(e) => setAiAnchor(e.currentTarget)} aria-label="AI suggestions" aria-haspopup="dialog" aria-expanded={!!aiAnchor} sx={{ color: "text.primary" }}>
                  <Badge variant="dot" color="warning" invisible={item.ai.flags.length === 0} overlap="circular">
                    <Sparkles size={18} />
                  </Badge>
                </IconButton>
              </Tooltip>
              )}
              <IconButton onClick={() => onEditing(false)} aria-label="Close story" sx={{ color: c.meta, mr: -1 }}>
                <X size={18} />
              </IconButton>
            </>
          )}
        </Box>
      )}

      {editing ? (
        // Every field of the story, in place of the message
        <Box component="section" aria-label="Story" sx={{ flex: 1, minHeight: 0, overflowY: "auto", backgroundColor: "background.paper" }}>
          <Box sx={{ maxWidth: 760, mx: "auto", px: { xs: 2, sm: 3 }, py: 2.5 }}>
            <StoryEditor
              item={item}
              folder={folder}
              readOnly={!canReview}
              canSeeFtp={canSeeFtp}
              canRename={canRename}
              onChange={(patch) => desk.updateDraft(item.id, patch)}
              onResetSlug={() => desk.resetSlug(item.id)}
              onRenameFolder={() => setRenaming(true)}
              onAnotherHeadline={() => desk.cycleAiHeadline(item.id)}
              reporters={desk.reporters}
              onReporter={desk.live ? (reporterId) => desk.setReporter(item.id, reporterId) : undefined}
            />
          </Box>
        </Box>
      ) : (
        <>
          {/* Phones only: the way back to the list */}
          {email && onBack && (
            <Box sx={{ flexShrink: 0, display: "flex", alignItems: "center", height: 48, px: 1, backgroundColor: c.mail, borderBottom: "1px solid", borderColor: "divider" }}>
              <IconButton onClick={onBack} aria-label="Back to intake">
                <ArrowLeft size={18} />
              </IconButton>
            </Box>
          )}

          {/* The message: a WhatsApp chat wall, or a Gmail reading pane */}
          <Box
            component="section"
            aria-label={email ? "Email" : "Message"}
            sx={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: email ? 0 : 1.5,
              px: email ? { xs: 2, sm: 3 } : { xs: 1.5, sm: 2, md: "5%" },
              py: email ? 3 : 2.5,
              backgroundColor: email ? c.mail : c.wall,
              ...(email ? {} : { backgroundImage: `radial-gradient(${c.wallDots} 1px, transparent 1px)`, backgroundSize: "18px 18px" }),
            }}
          >
            {!email && <Typography sx={dateTagSx}>{dayPill(item.receivedAt)}</Typography>}
            {item.stage === "rejected" && item.rejectReason && (
              <Typography sx={noticeSx}>
                {item.reviewedBy ? `Rejected by ${item.reviewedBy}` : "Rejected"}: {item.rejectReason}
              </Typography>
            )}
            {item.stage === "published" && <Typography sx={noticeSx}>Sent to Octopus as {item.draft.slug}</Typography>}
            {email ? <EmailMessage item={item} onRetry={onRetry} /> : <WhatsAppMessage item={item} onRetry={onRetry} />}
            {/* Footage on the FTP; only a build 1 backend sends it */}
            {item.footage && (
              <FootagePanel
                item={item}
                footage={item.footage}
                meta={email ? c.mailMeta : c.meta}
                onRecheck={canReview ? () => desk.recheckFootage(item.id) : undefined}
                onPick={canPickFootage ? () => setPicking(true) : undefined}
                sx={email ? { ml: MAIL_INDENT, mt: 3, maxWidth: 928 } : { alignSelf: "flex-start", width: { xs: "95%", md: "85%", lg: "75%", xl: "65%" }, ml: 1 }}
              />
            )}
          </Box>
        </>
      )}

      {/* Decision bar, where a chat client has the composer. The buttons always sit on the right; a note only appears when something needs attention. */}
      <Box
        sx={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 1,
          flexWrap: "wrap",
          minHeight: 62,
          px: 2,
          py: 1,
          backgroundColor: email && !editing ? c.mail : c.bar,
          borderTop: "1px solid",
          borderColor: email && !editing ? "divider" : c.line,
          ...(email && !editing ? { "& .MuiButton-root": { borderRadius: "999px" } } : {}),
        }}
      >
        <Box sx={{ flex: "1 1 auto", minWidth: 0 }}>
          {!canReview && <Typography sx={note}>View only. The assignment desk approves stories.</Typography>}
          {canReview && item.stage === "new" && (problem || failed > 0) && (
            <Typography sx={{ ...note, color: "warning.main" }}>{problem ?? `${failed} ${failed === 1 ? "file" : "files"} failed to download and won't go to Octopus.`}</Typography>
          )}
          {canReview && busy && (
            <Typography sx={{ ...note, color: "text.primary", display: "flex", alignItems: "center", gap: 1 }}>
              <CircularProgress size={12} color="inherit" /> Sending to Octopus
            </Typography>
          )}
          {canReview && item.stage === "published" && (
            <Typography sx={note}>
              {entry?.updatedAt && !entry.pulledAt ? "Update sent. Octopus picks it up on its next read." : canManageFeed ? "Edited the text? Send the update so Octopus gets the new version." : "Sent to Octopus."}
            </Typography>
          )}
          {canReview && item.stage === "rejected" && <Typography sx={note}>Rejected stories stay here for the shift.</Typography>}
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", justifyContent: "flex-end", ml: "auto" }}>
          <Button variant="outlined" onClick={() => onEditing(!editing)} aria-pressed={editing} startIcon={editing ? <Check size={15} /> : <Pencil size={15} />} sx={quietButtonSx}>
            {editing ? "Done" : canReview ? "Edit story" : "Story details"}
          </Button>
          {canReview && item.stage === "new" && (
            <>
              <Button variant="outlined" color="error" onClick={() => setRejecting(true)} startIcon={<X size={15} />} sx={{ backgroundColor: email ? "transparent" : c.bubble }}>
                Reject
              </Button>
              <Button
                variant="contained"
                onClick={() => {
                  desk.approve(item.id);
                  onDecided?.();
                }}
                disabled={!!problem}
                startIcon={<Check size={15} />}
              >
                Approve
              </Button>
            </>
          )}
          {item.stage === "published" && (
            <>
              {canSeeFtp && (
                <Button component={Link} href="/ftp" variant="outlined" startIcon={<FolderTree size={15} />} sx={quietButtonSx}>
                  FTP folder
                </Button>
              )}
              {canManageFeed && (
                <Button variant="contained" onClick={() => desk.pushFeedUpdate(item.id)} startIcon={<Rss size={15} />}>
                  Send update
                </Button>
              )}
            </>
          )}
          {canReview && item.stage === "rejected" && (
            <Button variant="outlined" onClick={() => desk.reopen(item.id)} startIcon={<RotateCcw size={15} />} sx={quietButtonSx}>
              Move back to review
            </Button>
          )}
        </Box>
      </Box>

      {rejecting && (
        <RejectDialog
          headline={item.draft.headline}
          onClose={() => setRejecting(false)}
          onReject={(reason, note) => {
            desk.reject(item.id, reason, note);
            setRejecting(false);
            onDecided?.();
          }}
        />
      )}
      {renaming && folder && <FolderDialog folder={folder} onClose={() => setRenaming(false)} />}
      {picking && <FtpPickerDialog item={item} onClose={() => setPicking(false)} />}
      <Popover
        open={editing && !!aiAnchor}
        anchorEl={aiAnchor}
        onClose={() => setAiAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { role: "dialog", "aria-label": "AI suggestions", sx: { width: 400, maxWidth: "calc(100vw - 32px)", maxHeight: "min(640px, 75vh)", overflowY: "auto", p: 2, mt: 0.5, borderRadius: "12px" } } }}
      >
        <AiPanel item={item} onApply={(part) => desk.applyAi(item.id, part)} onAnotherHeadline={() => desk.cycleAiHeadline(item.id)} readOnly={!canReview} />
      </Popover>
    </Box>
  );
}
