/**
 * Generate a URL-safe slug from a string.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Format a date for display.
 */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format a number with commas.
 */
export function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

/**
 * Detect device type from user-agent.
 */
export function detectDeviceType(ua: string): string {
  if (/mobile/i.test(ua)) return "mobile";
  if (/tablet|ipad/i.test(ua)) return "tablet";
  return "desktop";
}

/**
 * Validate that a URL looks like an Amazon product link.
 */
export function isValidProductUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname.includes("amazon.") ||
      parsed.hostname.includes("amzn.")
    );
  } catch {
    return false;
  }
}

/**
 * Generate CSV content from an array of objects.
 */
export function arrayToCsv(data: Record<string, unknown>[]): string {
  if (data.length === 0) return "";
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers.map((h) => {
      const val = String(row[h] ?? "");
      return val.includes(",") || val.includes('"')
        ? `"${val.replace(/"/g, '""')}"`
        : val;
    }).join(",")
  );
  return [headers.join(","), ...rows].join("\n");
}
