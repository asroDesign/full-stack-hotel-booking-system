export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { getAttractions, getRooms, getSettings } from "@/lib/data";
import { sanitizeText } from "@/lib/security";

function escapeXml(value: string): string {
  return sanitizeText(value, 2000)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const [settings, rooms, attractions] = await Promise.all([getSettings(), getRooms(), getAttractions()]);
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://atalar-hotel.ir";

  const items = [
    ...rooms.map((room) => ({
      title: room.name,
      link: `${baseUrl}/rooms/${room.slug}`,
      description: room.description,
      date: room.updatedAt,
      category: "اتاق‌ها",
    })),
    ...attractions.map((attraction) => ({
      title: attraction.title,
      link: `${baseUrl}/attractions`,
      description: attraction.description,
      date: attraction.createdAt,
      category: "جاذبه‌ها",
    })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(settings.hotelName)}</title>
    <link>${escapeXml(baseUrl)}</link>
    <description>${escapeXml(settings.tagline)}</description>
    <language>fa-IR</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${items
      .map(
        (item) => `<item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.link)}</link>
      <guid isPermaLink="true">${escapeXml(item.link)}</guid>
      <description>${escapeXml(item.description)}</description>
      <category>${escapeXml(item.category)}</category>
      <pubDate>${new Date(item.date).toUTCString()}</pubDate>
    </item>`,
      )
      .join("\n    ")}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=600" },
  });
}
