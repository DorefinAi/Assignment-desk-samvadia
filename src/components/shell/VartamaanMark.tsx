// The assignment desk mark: a story comes in from the left, through the opening in the ring,
// towards the dot at the centre, where the desk decides on it. The digital desk's mark is its
// pair, with a dot leaving through an opening on the right. Drawn in currentColor so it
// follows the text colour. app/icon.svg is the same mark on a tile.
export default function VartamaanMark({ size = 24 }: { size?: number }) {
  return (
    <svg height={size} width={(size * 130) / 110} viewBox="0 0 130 110" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M40.36 35 A40 40 0 1 1 40.36 75" stroke="currentColor" strokeWidth="15" />
      <rect x="0" y="47.5" width="54" height="15" fill="currentColor" />
      <circle cx="75" cy="55" r="13" fill="currentColor" />
    </svg>
  );
}
