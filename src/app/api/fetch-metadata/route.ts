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

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; QRShelf/1.0; +https://qrshelf.com)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: controller.signal,
      redirect: "follow",
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch URL (${response.status})` },
        { status: 400 }
      );
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      return NextResponse.json(
        { error: "URL does not return HTML" },
        { status: 400 }
      );
    }

    // Read only the first 100KB to avoid memory issues
    const reader = response.body?.getReader();
    if (!reader) {
      return NextResponse.json({ error: "Cannot read response" }, { status: 500 });
    }

    let html = "";
    const decoder = new TextDecoder();
    const maxBytes = 100 * 1024;
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

    const metadata: LinkMetadata = {
      title: ogTitle || htmlTitle || "",
      image: resolveUrl(ogImage, baseUrl),
      description: ogDescription || metaDescription || "",
      favicon: favicon,
      siteName: ogSiteName || parsedUrl.hostname.replace("www.", ""),
    };

    // Clean up Amazon titles (remove the " : Amazon.com : ..." suffix)
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
