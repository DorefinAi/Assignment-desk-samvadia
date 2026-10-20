// Builds the RSS 2.0 document Octopus reads. One <item> per live feed entry;
// the enclosure points at the story's FTP folder so Octopus can link the media.
import { FeedEntry, FtpFolder, IntakeItem } from "@/types/desk";
import { filedName, folderPath, locationName } from "./slug";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const FTP_HOST = "ftp://10.10.4.20";

export function buildFeedXml(feedUrl: string, entries: FeedEntry[], items: IntakeItem[], folders: FtpFolder[]) {
  const live = entries.filter((e) => e.live).sort((a, b) => new Date(b.updatedAt ?? b.publishedAt).getTime() - new Date(a.updatedAt ?? a.publishedAt).getTime());
  const last = live[0] ? new Date(live[0].updatedAt ?? live[0].publishedAt).toUTCString() : new Date().toUTCString();

  const rows = live.map((entry) => {
    const item = items.find((i) => i.id === entry.itemId);
    const folder = folders.find((f) => f.id === entry.folderId);
    if (!item || !folder) return "";
    const path = folderPath(folder.date, folder.locationCode, folder.slug);
    const media = item.attachments
      .filter((a) => folder.attachmentIds.includes(a.id))
      .map((a, i) => `      <media:content url="${esc(FTP_HOST + path + filedName(folder.slug, i, a.fileName, a.kind))}" medium="${a.kind}" />`);
    return [
      "    <item>",
      `      <title>${esc(item.draft.headline)}</title>`,
      `      <guid isPermaLink="false">${esc(folder.slug)}</guid>`,
      `      <description>${esc(item.draft.body)}</description>`,
      `      <category>${esc(item.draft.category)}</category>`,
      `      <desk:slug>${esc(folder.slug)}</desk:slug>`,
      `      <desk:location code="${folder.locationCode}">${esc(locationName(folder.locationCode))}</desk:location>`,
      `      <desk:priority>${item.draft.priority}</desk:priority>`,
      `      <desk:folder>${esc(FTP_HOST + path)}</desk:folder>`,
      ...media,
      `      <pubDate>${new Date(entry.publishedAt).toUTCString()}</pubDate>`,
      "    </item>",
    ].join("\n");
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/" xmlns:desk="https://vartamaan.ai/ns/desk">',
    "  <channel>",
    "    <title>1st India News · Assignment desk</title>",
    `    <link>${esc(feedUrl)}</link>`,
    "    <description>Approved stories for Octopus</description>",
    `    <lastBuildDate>${last}</lastBuildDate>`,
    ...rows.filter(Boolean),
    "  </channel>",
    "</rss>",
  ].join("\n");
}
