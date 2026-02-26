import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QRShelf – Product Recommendations via QR",
  description: "Create your shop, recommend products, and share via printable QR codes.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
