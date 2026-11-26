// Offline stand-ins for photo and video stills in demo mode: a small SVG "scene" (sky, sun, buildings,
// ground) as a data URL, so the thread and the viewer have something to show without a backend.
// The two demo video previews are tiny WebM clips in public/demo (WebM so Chromium without H.264 plays them too).

function svgUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** A flat landscape still; sky gradient from `top` to `bottom`, ground in `ground` */
export function scene(top: string, bottom: string, ground: string, width = 480, height = 270): string {
  const g = Math.round(height * 0.62);
  return svgUrl(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
      `<defs><linearGradient id="s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient></defs>` +
      `<rect width="${width}" height="${height}" fill="url(#s)"/>` +
      `<rect y="${g}" width="${width}" height="${height - g}" fill="${ground}" opacity=".6"/>` +
      `<circle cx="${Math.round(width * 0.75)}" cy="${Math.round(height * 0.24)}" r="${Math.round(Math.min(width, height) * 0.11)}" fill="#fff" opacity=".5"/>` +
      `<rect x="${Math.round(width * 0.1)}" y="${Math.round(height * 0.4)}" width="${Math.round(width * 0.15)}" height="${g - Math.round(height * 0.4)}" fill="#000" opacity=".18"/>` +
      `<rect x="${Math.round(width * 0.3)}" y="${Math.round(height * 0.34)}" width="${Math.round(width * 0.22)}" height="${g - Math.round(height * 0.34)}" fill="#000" opacity=".12"/>` +
      `</svg>`
  );
}

export const DEMO_STILL = {
  rain: scene("#7aa7c7", "#3f5f7a", "#4b6b52"),
  road: scene("#9db8cf", "#56708a", "#5f6e5a"),
  street: scene("#b8c4cc", "#6d7c86", "#384048"),
  pump: scene("#8fb3c9", "#4d6f86", "#3e5a4a"),
  rainTall: scene("#a5c1d4", "#4f6d84", "#4b6b52", 270, 360),
  night: scene("#3b4a6b", "#141a2b", "#2b2f3a"),
  stage: scene("#f2d27c", "#c5763d", "#7a2f2f"),
  crowd: scene("#e3b07a", "#a45b34", "#5b3a2a"),
} as const;

/** 480p preview clips served from public/demo (a few KB each) */
export const DEMO_CLIP = { rain: "/demo/rain-480p.webm", stage: "/demo/stage-480p.webm" } as const;
