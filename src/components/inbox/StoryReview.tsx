"use client";

// One conversation as a chat: a header bar (who, where, and what the story holds), the story's messages
// (WhatsApp or an email thread, see ThreadView) and a bar with the decision. "Edit story" swaps the message for
// the Story editor, so the screen stays two panes: the list and whichever one you are working in.
import React, { useState } from "react";
import Link from "next/link";
import { Badge, Box, Button, CircularProgress, IconButton, Popover, SxProps, Theme, Tooltip, Typography } from "@mui/material";
import { ArrowLeft, Check, FolderTree, MapPin, Pencil, RotateCcw, Rss, Sparkles, X } from "lucide-react";
import { useDesk } from "@/providers/DeskProvider";
import { useCan } from "@/hooks/useCan";
import { IntakeItem } from "@/types/desk";
import { slugError } from "@/lib/slug";
import { SOURCE_META } from "@/components/common/shared";
import FolderDialog from "@/components/ftp/FolderDialog";
import AiPanel from "./AiPanel";
import ChatAvatar from "./ChatAvatar";
import ThreadView, { BUBBLE_MAX } from "./ThreadView";
import StoryEditor from "./StoryEditor";
import RejectDialog from "./RejectDialog";
import FootagePanel from "./FootagePanel";
import FtpPickerDialog from "./FtpPickerDialog";
import StoryMeta from "./StoryMeta";
import { useChatColors } from "./chatTheme";
import { plural, threadCounts } from "./threadModel";

interface StoryReviewProps {
  item: IntakeItem;
  onBack?: () => void;
  /** The Story editor is showing; kept by the page so it stays open from one message to the next */
  editing: boolean;
  onEditing: (open: boolean) => void;
  /** Called after Approve or Reject, so the page can move on to the next story */
  onDecided?: () => void;
}

export default function StoryReview({ item, onBack, editing, onEditing, onDecided }: StoryReviewProps) {
  const desk = useDesk();
  const c = useChatColors();
  const [rejecting, setRejecting] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [picking, setPicking] = useState(false);
  const [aiAnchor, setAiAnchor] = useState<HTMLElement | null>(null);
  // The media viewer covers this pane
  const [pane, setPane] = useState<HTMLElement | null>(null);
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

  const counts = threadCounts(item);

  // WhatsApp Web's yellow notice strip, for both sources
  const noticeSx: SxProps<Theme> = { alignSelf: "center", maxWidth: 560, px: 1.25, py: 0.625, borderRadius: "5px", backgroundColor: c.notice, color: c.noticeText, fontSize: "0.77rem", lineHeight: "20px", textAlign: "center" };
  const note = { fontSize: "0.75rem", color: c.meta };
  const quietButtonSx = { borderColor: "divider", color: "text.primary", backgroundColor: c.bubble };
  // Header: the email's subject, or the sender and their role; then contact, district and source once
  // for the whole story (the bubbles don't repeat them), and on the right what the story holds
  const title = email ? item.subject || item.sender.name : `${item.sender.name} · ${item.sender.role}`;
  const contact = email ? `${item.sender.name}${item.sender.contact ? ` <${item.sender.contact}>` : ""}` : item.sender.contact;
  const sourceLabel = email ? (counts.messages > 1 ? "Email thread" : "Email") : SOURCE_META[item.source].label;
  const chips = [
    counts.messages > 0 && plural(counts.messages, email ? "email" : "message"),
    counts.photos > 0 && plural(counts.photos, "photo"),
    counts.videos > 0 && plural(counts.videos, "video"),
    counts.files > 0 && plural(counts.files, "file"),
  ].filter((x): x is string => !!x);
  const metaSx = { fontSize: "0.78125rem", color: c.meta, whiteSpace: "nowrap", flexShrink: 0 } as const;
  const onRetry = canReview ? (id: string) => desk.retryDownload(item.id, id) : undefined;

  return (
    <Box ref={setPane} sx={{ position: "relative", display: "flex", flexDirection: "column", height: "100%", minHeight: 0, minWidth: 0 }}>
      {/* Conversation header */}
      <Box component="header" sx={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 1.5, minHeight: 60, px: 2, py: 1, backgroundColor: c.bar, borderBottom: "1px solid", borderColor: c.line }}>
        {onBack && (
          <IconButton onClick={onBack} aria-label="Back to intake" sx={{ ml: -1 }}>
            <ArrowLeft size={18} />
          </IconButton>
        )}
        <ChatAvatar item={item} size={40} />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography component="h2" noWrap title={editing ? undefined : title} sx={{ fontSize: "0.9375rem", fontWeight: 600, lineHeight: 1.5 }}>
            {editing ? "Story" : title}
          </Typography>
          {editing ? (
            <Typography noWrap sx={note}>From {item.sender.name}</Typography>
          ) : (
            <Box sx={{ display: "flex", alignItems: "center", columnGap: 1.5, minWidth: 0, overflow: "hidden", lineHeight: 1.5 }}>
              {contact && (
                <Typography noWrap title={contact} sx={{ ...metaSx, flexShrink: 1, minWidth: 0 }}>
                  {contact}
                </Typography>
              )}
              {item.district && (
                <Typography title={item.district.nameHi ?? undefined} sx={{ ...metaSx, display: "inline-flex", alignItems: "center", gap: 0.375 }}>
                  <MapPin size={12} aria-hidden />
                  {item.district.name} ({item.district.code})
                </Typography>
              )}
              {item.chat && (
                <Typography noWrap title={item.chat} sx={{ ...metaSx, flexShrink: 1, minWidth: 0 }}>
                  {item.chat}
                </Typography>
              )}
              {/* Phones: the avatar's badge already shows the source */}
              <Typography sx={{ ...metaSx, display: { xs: "none", sm: "block" } }}>{sourceLabel}</Typography>
              <StoryMeta item={item} color={c.meta} withDistrict={false} sx={{ flexWrap: "nowrap", flexShrink: 0 }} />
            </Box>
          )}
        </Box>
        {!editing && chips.length > 0 && (
          <Box component="ul" aria-label="In this story" sx={{ display: { xs: "none", sm: "flex" }, gap: 0.75, m: 0, p: 0, listStyle: "none", flexShrink: 0 }}>
            {chips.map((chip) => (
              <Box component="li" key={chip} sx={{ px: 1.25, height: 26, display: "inline-flex", alignItems: "center", borderRadius: "13px", border: "1px solid", borderColor: c.line, backgroundColor: c.bubble, color: "text.primary", fontSize: "0.75rem", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                {chip}
              </Box>
            ))}
          </Box>
        )}
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
          {/* The story's messages on the chat wall, oldest first; the decision notices come after them */}
          <Box
            component="section"
            aria-label={email ? "Email thread" : "Messages"}
            sx={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              // Groups, date dividers and desk notes are 12px apart; bubbles inside a group 3px
              gap: 1.5,
              px: { xs: 1.5, sm: 2, md: "4%" },
              py: 2,
              backgroundColor: c.wall,
              backgroundImage: `radial-gradient(${c.wallDots} 1px, transparent 1px)`,
              backgroundSize: "18px 18px",
            }}
          >
            <ThreadView key={item.id} item={item} onRetry={onRetry} viewerContainer={pane} />
            {item.stage === "rejected" && item.rejectReason && (
              <Typography sx={noticeSx}>
                {item.reviewedBy ? `Rejected by ${item.reviewedBy}` : "Rejected"}: {item.rejectReason}
              </Typography>
            )}
            {item.stage === "published" && <Typography sx={noticeSx}>Sent to Octopus as {item.draft.slug}</Typography>}
            {/* Footage on the FTP; only a build 1 backend sends it */}
            {item.footage && (
              <FootagePanel
                item={item}
                footage={item.footage}
                meta={c.meta}
                onRecheck={canReview ? () => desk.recheckFootage(item.id) : undefined}
                onPick={canPickFootage ? () => setPicking(true) : undefined}
                sx={{ alignSelf: "flex-start", width: BUBBLE_MAX, ml: 1 }}
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
          backgroundColor: c.bar,
          borderTop: "1px solid",
          borderColor: c.line,
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
              <Button variant="outlined" color="error" onClick={() => setRejecting(true)} startIcon={<X size={15} />} sx={{ backgroundColor: c.bubble }}>
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
