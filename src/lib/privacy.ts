import { createHash } from "crypto";

/**
 * Hash an IP address with a daily-rotating salt.
 * Produces a one-way hash that can't be reversed to the original IP,
 * but allows deduplication within the same day.
 */
export function hashIp(ip: string): string {
  const secret = process.env.IP_HASH_SECRET || "default-secret";
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const salt = `${secret}:${today}`;

  return createHash("sha256")
    .update(`${ip}:${salt}`)
    .digest("hex")
    .slice(0, 16); // truncated hash – sufficient for dedup
}
