import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.FROM_EMAIL || "QRShelf <noreply@qrshelf.com>";

interface NotifyNewProductParams {
  emails: string[];
  collectionTitle: string;
  productTitle: string;
  productImage?: string;
  productNote?: string;
  collectionUrl: string;
}

export async function notifyNewProduct({
  emails,
  collectionTitle,
  productTitle,
  productImage,
  productNote,
  collectionUrl,
}: NotifyNewProductParams) {
  if (!resend || emails.length === 0) return;

  const subject = `New product added to "${collectionTitle}"`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; background: linear-gradient(135deg, #14b8a6, #0f766e); color: white; font-weight: bold; font-size: 14px; width: 36px; height: 36px; line-height: 36px; border-radius: 8px;">Q</div>
      </div>
      <h2 style="color: #0f172a; font-size: 20px; margin: 0 0 8px;">New product added!</h2>
      <p style="color: #64748b; font-size: 14px; margin: 0 0 20px;">
        A new product was just added to <strong>${collectionTitle}</strong>.
      </p>
      ${productImage ? `<img src="${productImage}" alt="${productTitle}" style="width: 100%; max-height: 200px; object-fit: cover; border-radius: 12px; margin-bottom: 16px;" />` : ""}
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
        <h3 style="color: #0f172a; font-size: 16px; margin: 0 0 4px;">${productTitle}</h3>
        ${productNote ? `<p style="color: #64748b; font-size: 13px; margin: 0;">${productNote}</p>` : ""}
      </div>
      <a href="${collectionUrl}" style="display: block; background: #0d9488; color: white; text-align: center; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
        View Collection
      </a>
      <p style="color: #94a3b8; font-size: 11px; text-align: center; margin-top: 24px;">
        You're receiving this because you subscribed to updates for "${collectionTitle}".
      </p>
    </div>
  `;

  // Send in batches (Resend supports up to 100 per call)
  const batchSize = 50;
  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);
    try {
      await Promise.all(
        batch.map((email) =>
          resend.emails.send({
            from: FROM_EMAIL,
            to: email,
            subject,
            html,
          })
        )
      );
    } catch (err) {
      console.error("Failed to send notification emails:", err);
    }
  }
}
