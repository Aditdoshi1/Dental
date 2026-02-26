import { describe, it, expect } from "vitest";
import { slugify, detectDeviceType, isValidProductUrl, arrayToCsv } from "@/lib/utils";
import { hashIp } from "@/lib/privacy";
import { checkRateLimit } from "@/lib/rate-limit";

describe("slugify", () => {
  it("converts title to slug", () => {
    expect(slugify("Post-Cleaning Essentials")).toBe("post-cleaning-essentials");
  });

  it("handles special characters", () => {
    expect(slugify("Kids' Fluoride Toothpaste (Age 6+)")).toBe(
      "kids-fluoride-toothpaste-age-6"
    );
  });

  it("trims whitespace", () => {
    expect(slugify("  hello world  ")).toBe("hello-world");
  });

  it("collapses multiple dashes", () => {
    expect(slugify("a---b---c")).toBe("a-b-c");
  });
});

describe("detectDeviceType", () => {
  it("detects mobile", () => {
    expect(detectDeviceType("Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) Mobile")).toBe("mobile");
  });

  it("detects tablet", () => {
    expect(detectDeviceType("Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X)")).toBe("tablet");
  });

  it("defaults to desktop", () => {
    expect(detectDeviceType("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe("desktop");
  });
});

describe("isValidProductUrl", () => {
  it("accepts amazon.com URLs", () => {
    expect(isValidProductUrl("https://www.amazon.com/dp/B08N5WRWNW")).toBe(true);
  });

  it("accepts amzn.to URLs", () => {
    expect(isValidProductUrl("https://amzn.to/3xYz123")).toBe(true);
  });

  it("rejects non-Amazon URLs", () => {
    expect(isValidProductUrl("https://google.com")).toBe(false);
  });

  it("rejects invalid URLs", () => {
    expect(isValidProductUrl("not-a-url")).toBe(false);
  });
});

describe("hashIp", () => {
  it("returns a hex string", () => {
    const hash = hashIp("192.168.1.1");
    expect(hash).toMatch(/^[0-9a-f]{16}$/);
  });

  it("returns same hash for same IP within same call", () => {
    const h1 = hashIp("10.0.0.1");
    const h2 = hashIp("10.0.0.1");
    expect(h1).toBe(h2);
  });

  it("returns different hash for different IPs", () => {
    const h1 = hashIp("10.0.0.1");
    const h2 = hashIp("10.0.0.2");
    expect(h1).not.toBe(h2);
  });
});

describe("checkRateLimit", () => {
  it("allows requests within limit", () => {
    const key = `test-${Date.now()}`;
    const result = checkRateLimit(key);
    expect(result.allowed).toBe(true);
  });

  it("blocks after exceeding limit", () => {
    const key = `flood-${Date.now()}`;
    for (let i = 0; i < 30; i++) {
      checkRateLimit(key);
    }
    const result = checkRateLimit(key);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });
});

describe("arrayToCsv", () => {
  it("converts array to CSV", () => {
    const data = [
      { name: "Alice", age: 30 },
      { name: "Bob", age: 25 },
    ];
    const csv = arrayToCsv(data);
    expect(csv).toContain("name,age");
    expect(csv).toContain("Alice,30");
    expect(csv).toContain("Bob,25");
  });

  it("handles commas in values", () => {
    const data = [{ name: "Last, First", value: "ok" }];
    const csv = arrayToCsv(data);
    expect(csv).toContain('"Last, First"');
  });

  it("returns empty string for empty array", () => {
    expect(arrayToCsv([])).toBe("");
  });
});
