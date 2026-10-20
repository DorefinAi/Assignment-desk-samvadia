# Assignment desk: design direction

Taken from the digital desk (`digital desk/src/providers/MuiProvider.tsx`, `layout.tsx`
and its header and overview components) so the two desks read as one product.
Anything that differs from the digital desk says why.

Dial: ENERGY 1 / RHYTHM 2 / MOTION 1

## Identity

- An internal newsroom tool for desk editors working a shift. It is read for hours,
  so it stays quiet: black ink on paper, with colour kept for state.
- Identity motif: the **slug** (`JDH_RAIN_WATERLOGGING`). It is how the desk names a
  story on the FTP and in Octopus, so wherever a story is referenced the slug appears
  in Roboto Mono, semibold, in ink.

## Palette

| Token | Light | Dark | Use |
|---|---|---|---|
| Ink (primary, text) | `#000000` | `#FFFFFF` | Text, primary buttons, in-progress state |
| Secondary text | `#6D6E6F` | `#B0B0B0` | Hints, metadata |
| Page | `#F8F9FA` | `#121212` | Background |
| Paper | `#FFFFFF` | `#1E1E1E` | Cards, panels, sidebar |
| Accent: waiting on the desk | `#C2410C` | `#FB923C` | Only for "this needs a desk decision": the to-review count and stage, and the reasons in "Needs a decision" |
| Done | `#2E7D32` | `#81C784` | Filed, in the feed, downloaded |
| Problem | `#C62828` | `#EF9A9A` | Rejected, failed, breaking (solid tag). High priority is an ink outline tag |

- The accent is the digital desk's orange (`#E65100`) taken one step deeper, because
  `#E65100` is 3.79:1 on white and fails AA for small text. `#C2410C` is 5.18:1.
- Source colours (WhatsApp `#1A9E4B`, Outlook `#0F6CBD`) are used only on the source
  glyph, so an editor can tell the channel at a glance. They are never text colours.
- No other hues. No info blue, no purple, no per-card tints.

## Type

- Roboto for UI, Noto Sans Devanagari for Hindi, Roboto Mono for slugs, paths and
  times: the same three faces as the digital desk, loaded through `next/font`.
- Base 13px. Body 0.875rem, small text 0.75 to 0.8125rem, line-height 1.45.
- Section labels are sentence case and semibold. No uppercase tracking.

## Shape and depth

- Radius: 8px for inputs, menus and small tiles, 12px for buttons, cards and panels.
- Cards sit flat with a 1px divider border. Only popovers and dialogs carry a shadow
  (`0 4px 20px rgba(0,0,0,0.15)`), because they float above the page.
- Header icon buttons are 40px, outlined, 12px radius, as in the digital desk header.

## Motion

- Hover and focus states only. Progress bars move because a download is moving.
  Nothing pulses or loops.
