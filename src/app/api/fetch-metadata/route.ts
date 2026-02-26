import { NextRequest, NextResponse } from "next/server";

interface LinkMetadata {
  title: string;
  image: string;
  description: string;
  favicon: string;
  siteName: string;
}

function extractMetaContent(html: string, property: string): string {
  // Try property="..." (Open Graph)
  const ogRegex = new RegExp(
    `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`,
    "i"
  );
  const ogMatch = html.match(ogRegex);
  if (ogMatch) return ogMatch[1];

  // Try content="..." property="..." (reversed order)
  const reverseRegex = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`,
    "i"
  );
  const reverseMatch = html.match(reverseRegex);
  if (reverseMatch) return reverseMatch[1];

  return "";
}

function extractTitle(html: string): string {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return titleMatch ? titleMatch[1].trim() : "";
}

function extractFavicon(html: string, baseUrl: string): string {
  const linkRegex = /<link[^>]+rel=["'](?:icon|shortcut icon)["'][^>]+href=["']([^"']+)["']/i;
  const match = html.match(linkRegex);
  if (match) {
    try {
      return new URL(match[1], baseUrl).href;
    } catch {
      return "";
    }
  }

  // Try reversed attribute order
  const reverseRegex = /<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:icon|shortcut icon)["']/i;
  const reverseMatch = html.match(reverseRegex);
  if (reverseMatch) {
    try {
      return new URL(reverseMatch[1], baseUrl).href;
    } catch {
      return "";
    }
  }

  try {
    return new URL("/favicon.ico", baseUrl).href;
  } catch {
    return "";
  }
}

function resolveUrl(url: string, base: string): string {
  if (!url) return "";
  try {
    return new URL(url, base).href;
  } catch {
    return url;
  }
}

/** Chrome-like request headers to reduce bot blocks (e.g. Amazon 503). */
function getBrowserHeaders(parsedUrl: URL): Record<string, string> {
  const hostname = parsedUrl.hostname.toLowerCase();
  const isAmazon = hostname.includes("amazon");
  const headers: Record<string, string> = {
    "User-Agent": isAmazon
      ? "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
    "Sec-Ch-Ua": '"Chromium";v="120", "Google Chrome";v="120", "Not_A Brand";v="24"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
  };
  if (isAmazon) {
    headers.Referer = `${parsedUrl.origin}/`;
  }
  return headers;
}

function applyAmazonExtraction(html: string, baseUrl: string, metadata: LinkMetadata): void {
  if (!metadata.image || metadata.image.includes("placeholder") || metadata.image.length < 50) {
    const mediaMatch = html.match(/https:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9_-]+\.(?:jpg|jpeg|png|webp)/);
    if (mediaMatch?.[0]) metadata.image = mediaMatch[0].replace(/\\u0026/g, "&");
  }
  if (!metadata.image || metadata.image.length < 50) {
    const hiResUnescaped = html.match(/"hiRes"\s*:\s*"(https:\/\/[^"]+)"/);
    if (hiResUnescaped?.[1]) metadata.image = hiResUnescaped[1].replace(/\\u0026/g, "&");
    if (!metadata.image || metadata.image.length < 50) {
      const largeUnescaped = html.match(/"large"\s*:\s*"(https:\/\/[^"]+)"/);
      if (largeUnescaped?.[1]) metadata.image = largeUnescaped[1].replace(/\\u0026/g, "&");
    }
    if (!metadata.image || metadata.image.length < 50) {
      const hiResMatch = html.match(/"hiRes"\s*:\s*"((https?:\\?\/\\?\/[^"]+))"/);
      if (hiResMatch?.[1]) metadata.image = hiResMatch[1].replace(/\\\//g, "/").replace(/\\u0026/g, "&");
    }
    if (!metadata.image || metadata.image.length < 50) {
      const largeMatch = html.match(/"large"\s*:\s*"((https?:\\?\/\\?\/[^"]+))"/);
      if (largeMatch?.[1]) metadata.image = largeMatch[1].replace(/\\\//g, "/").replace(/\\u0026/g, "&");
    }
  }
  if (!metadata.image) {
    const landingImg = html.match(/id=["']landingImage["'][^>]+src=["']([^"']+)["']/i)
      || html.match(/src=["']([^"']+)["'][^>]+id=["']landingImage["']/i)
      || html.match(/id=["']landingImage["'][^>]+data-a-dynamic-image=["']([^"']+)["']/i);
    if (landingImg) {
      const raw = landingImg[1];
      if (raw.startsWith("http")) metadata.image = raw;
      else if (raw.startsWith("{") && raw.includes("http")) {
        const firstUrl = raw.match(/"((https?:[^"]+))"/);
        if (firstUrl) metadata.image = firstUrl[1].replace(/\\u0026/g, "&");
      } else metadata.image = resolveUrl(raw, baseUrl);
    }
    if (!metadata.image) {
      const dynamicMatch = html.match(/data-a-dynamic-image=["'](\{[^"']+\})["']/i);
      if (dynamicMatch) {
        try {
          const decoded = dynamicMatch[1].replace(/&quot;/g, '"').replace(/\\"/g, '"');
          const obj = JSON.parse(decoded) as Record<string, unknown>;
          const firstKey = Object.keys(obj)[0];
          if (firstKey) metadata.image = firstKey.replace(/\\u0026/g, "&");
        } catch { /* ignore */ }
      }
    }
    if (!metadata.image) {
      const twImage = extractMetaContent(html, "twitter:image");
      if (twImage) metadata.image = resolveUrl(twImage, baseUrl);
    }
    if (!metadata.image) {
      const imgBlk = html.match(/id=["']imgBlkFront["'][^>]+src=["']([^"']+)["']/i)
        || html.match(/id=["']ebooksImgBlkFront["'][^>]+src=["']([^"']+)["']/i);
      if (imgBlk) metadata.image = resolveUrl(imgBlk[1], baseUrl);
    }
  }
  const dynamicMatch = html.match(/data-a-dynamic-image=["'](\{[^"']+\})["']/i);
  if (dynamicMatch && (!metadata.image || metadata.image.includes("placeholder") || metadata.image.length < 50)) {
    try {
      const decoded = dynamicMatch[1].replace(/&quot;/g, '"').replace(/\\"/g, '"');
      const obj = JSON.parse(decoded) as Record<string, unknown>;
      const firstKey = Object.keys(obj)[0];
      if (firstKey?.startsWith("http")) metadata.image = firstKey.replace(/\\u0026/g, "&");
    } catch { /* ignore */ }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    // Block internal/private URLs
    const hostname = parsedUrl.hostname.toLowerCase();
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      hostname.startsWith("172.") ||
      hostname.endsWith(".local")
    ) {
      return NextResponse.json({ error: "Internal URLs are not allowed" }, { status: 400 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const isAmazon = hostname.includes("amazon");
    let response: Response;
    try {
      response = await fetch(url, {
        headers: getBrowserHeaders(parsedUrl),
        signal: controller.signal,
        redirect: "follow",
      });
    } catch {
      response = null as unknown as Response;
    }

    clearTimeout(timeout);

    let metadata: LinkMetadata = {
      title: "",
      image: "",
      description: "",
      favicon: "",
      siteName: parsedUrl.hostname.replace("www.", ""),
    };

    // If direct fetch succeeded and returned HTML, parse it
    if (response?.ok) {
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("text/html") || contentType.includes("application/xhtml")) {
        const reader = response.body?.getReader();
        if (reader) {
          let html = "";
          const decoder = new TextDecoder();
          const maxBytes = hostname.includes("amazon") ? 250 * 1024 : 100 * 1024;
          let totalBytes = 0;
          while (totalBytes < maxBytes) {
            const { done, value } = await reader.read();
            if (done) break;
            html += decoder.decode(value, { stream: true });
            totalBytes += value.length;
          }
          reader.cancel();
          const baseUrl = parsedUrl.origin;
          const ogTitle = extractMetaContent(html, "og:title");
          const ogImage = extractMetaContent(html, "og:image");
          const ogDescription = extractMetaContent(html, "og:description");
          const ogSiteName = extractMetaContent(html, "og:site_name");
          const metaDescription = extractMetaContent(html, "description");
          const htmlTitle = extractTitle(html);
          const favicon = extractFavicon(html, baseUrl);
          metadata = {
            title: ogTitle || htmlTitle || "",
            image: resolveUrl(ogImage, baseUrl),
            description: ogDescription || metaDescription || "",
            favicon,
            siteName: ogSiteName || parsedUrl.hostname.replace("www.", ""),
          };
          // Amazon-specific extraction (see below)
          if (hostname.includes("amazon")) {
            applyAmazonExtraction(html, baseUrl, metadata);
          }
        }
      }
    }

    // Fallback: Microlink API when direct fetch failed or we have no image/title (e.g. captcha or bot block)
    const needsFallback = !response?.ok || !metadata.image || (isAmazon && !metadata.title);
    if (needsFallback) {
      try {
        const microlinkRes = await fetch(
          `https://api.microlink.io?url=${encodeURIComponent(url)}&screenshot=false&video=false&audio=false`,
          { signal: AbortSignal.timeout(10000), headers: { "Accept": "application/json" } }
        );
        if (microlinkRes.ok) {
          const json = await microlinkRes.json() as { data?: { image?: { url?: string }; title?: string; description?: string; logo?: { url?: string } } };
          const d = json?.data;
          if (d) {
            if (d.image?.url && !metadata.image) metadata.image = d.image.url;
            if (d.title && !metadata.title) metadata.title = d.title;
            if (d.description && !metadata.description) metadata.description = d.description;
            if (d.logo?.url && !metadata.favicon) metadata.favicon = d.logo.url;
          }
        }
      } catch { /* ignore */ }
    }

    // Clean up Amazon titles
    if (metadata.title && parsedUrl.hostname.includes("amazon")) {
      metadata.title = metadata.title
        .replace(/\s*:\s*Amazon\.com\s*:.*$/i, "")
        .replace(/\s*-\s*Amazon\.com$/i, "")
        .replace(/Amazon\.com\s*:\s*/i, "")
        .trim();
    }

    return NextResponse.json(metadata);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json({ error: "Request timed out" }, { status: 408 });
    }
    return NextResponse.json(
      { error: "Failed to fetch metadata" },
      { status: 500 }
    );
  }
}
