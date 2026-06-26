// Turns a bare URL into a rich card: title, thumbnail, author, platform, type.
// Uses oEmbed where available (YouTube), else parses Open Graph meta tags.

export type EnrichedLink = {
  title: string;
  thumbnail: string;
  author: string;
  platform: string;
  type: string; // "video" | "article" | "post" | "link"
  source: string;
};

function detectPlatform(hostname: string): { platform: string; type: string } {
  const h = hostname.replace(/^www\./, "").toLowerCase();
  if (h.includes("youtube.com") || h === "youtu.be") return { platform: "YouTube", type: "video" };
  if (h.includes("instagram.com")) return { platform: "Instagram", type: "post" };
  if (h.includes("substack.com")) return { platform: "Substack", type: "article" };
  if (h.includes("twitter.com") || h === "x.com" || h.endsWith(".x.com")) return { platform: "X", type: "post" };
  if (h.includes("medium.com")) return { platform: "Medium", type: "article" };
  if (h.includes("tiktok.com")) return { platform: "TikTok", type: "video" };
  if (h.includes("linkedin.com")) return { platform: "LinkedIn", type: "post" };
  if (h.includes("spotify.com")) return { platform: "Spotify", type: "audio" };
  if (h.includes("github.com")) return { platform: "GitHub", type: "link" };
  return { platform: "", type: "article" };
}

function metaTag(html: string, ...keys: string[]): string {
  for (const key of keys) {
    // property="og:title" content="..."  OR  name="..." content="..."  (either order)
    const patterns = [
      new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']*)["']`, "i"),
      new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${key}["']`, "i"),
    ];
    for (const re of patterns) {
      const m = html.match(re);
      if (m?.[1]) return decodeEntities(m[1].trim());
    }
  }
  return "";
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, " ");
}

async function fetchWithTimeout(url: string, ms: number, init?: RequestInit) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SuruBot/1.0)", ...(init?.headers ?? {}) },
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function enrichUrl(rawUrl: string): Promise<EnrichedLink> {
  let hostname = "";
  try { hostname = new URL(rawUrl).hostname; } catch { /* invalid url */ }
  const source = hostname.replace(/^www\./, "");
  const { platform, type } = detectPlatform(hostname);

  const fallback: EnrichedLink = { title: rawUrl, thumbnail: "", author: "", platform, type, source };

  try {
    // YouTube: oEmbed is reliable and gives author + thumbnail
    if (platform === "YouTube") {
      const res = await fetchWithTimeout(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(rawUrl)}&format=json`, 6000);
      if (res.ok) {
        const data = await res.json() as { title?: string; author_name?: string; thumbnail_url?: string };
        return {
          title: data.title || rawUrl,
          thumbnail: data.thumbnail_url || "",
          author: data.author_name || "",
          platform, type, source,
        };
      }
    }

    // Everything else: parse Open Graph tags from the HTML
    const res = await fetchWithTimeout(rawUrl, 6000);
    if (!res.ok) return fallback;
    const html = (await res.text()).slice(0, 200_000); // cap parse size

    const title =
      metaTag(html, "og:title", "twitter:title") ||
      html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ||
      rawUrl;
    const thumbnail = metaTag(html, "og:image", "twitter:image", "twitter:image:src");
    const author =
      metaTag(html, "author", "article:author", "og:site_name") ||
      "";

    return {
      title: decodeEntities(title),
      thumbnail,
      author,
      platform,
      type,
      source,
    };
  } catch {
    return fallback;
  }
}
