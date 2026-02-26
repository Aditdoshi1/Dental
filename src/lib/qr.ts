import QRCode from "qrcode";

export interface QrResult {
  svg: string;
  pngBuffer: Buffer;
}

/**
 * Generate QR code as both SVG string and PNG buffer.
 */
export async function generateQr(url: string): Promise<QrResult> {
  const svg = await QRCode.toString(url, {
    type: "svg",
    margin: 2,
    width: 300,
    errorCorrectionLevel: "M",
  });

  const pngBuffer = await QRCode.toBuffer(url, {
    type: "png",
    margin: 2,
    width: 600,
    errorCorrectionLevel: "M",
  });

  return { svg, pngBuffer };
}
