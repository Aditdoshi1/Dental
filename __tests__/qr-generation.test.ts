import { describe, it, expect } from "vitest";
import { generateQr } from "@/lib/qr";

describe("QR Code Generation", () => {
  it("generates both SVG and PNG", async () => {
    const url = "https://example.com/r/test123";
    const result = await generateQr(url);

    expect(result.svg).toBeTruthy();
    expect(result.svg).toContain("<svg");
    expect(result.svg).toContain("</svg>");

    expect(result.pngBuffer).toBeInstanceOf(Buffer);
    expect(result.pngBuffer.length).toBeGreaterThan(0);
  });

  it("SVG contains valid XML structure", async () => {
    const result = await generateQr("https://example.com/r/abc");

    expect(result.svg).toContain('xmlns="http://www.w3.org/2000/svg"');
  });

  it("PNG starts with PNG magic bytes", async () => {
    const result = await generateQr("https://example.com/r/xyz");

    // PNG files start with \x89PNG
    expect(result.pngBuffer[0]).toBe(0x89);
    expect(result.pngBuffer[1]).toBe(0x50); // P
    expect(result.pngBuffer[2]).toBe(0x4e); // N
    expect(result.pngBuffer[3]).toBe(0x47); // G
  });

  it("handles long URLs", async () => {
    const longUrl = "https://example.com/r/" + "a".repeat(100);
    const result = await generateQr(longUrl);

    expect(result.svg).toContain("<svg");
    expect(result.pngBuffer.length).toBeGreaterThan(0);
  });
});
