import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Notice – QRShelf",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
          ← Home
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 mt-4 mb-6">
          Privacy Notice
        </h1>

        <div className="prose prose-gray max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-gray-900">What We Collect</h2>
            <p className="text-gray-600">
              When you scan a QR code or visit a product recommendation page, we collect
              minimal, non-identifying information to help shop owners understand how their
              recommendations are being used:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li>
                <strong>Anonymized device information:</strong> We record the type of device
                used (mobile, tablet, desktop) based on your browser&apos;s user agent string.
              </li>
              <li>
                <strong>Hashed IP address:</strong> We store a one-way hash of your IP address
                with a daily-rotating salt. This means we cannot recover your actual IP address.
                It is used only for approximate deduplication.
              </li>
              <li>
                <strong>Page interactions:</strong> We log which product links are clicked to
                help shop owners understand which recommendations are most helpful.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">What We Do NOT Collect</h2>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li>No names, email addresses, or phone numbers of visitors</li>
              <li>No customer identifiers or appointment information</li>
              <li>No financial or payment information</li>
              <li>No cookies for advertising or cross-site tracking</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">Third-Party Links</h2>
            <p className="text-gray-600">
              Product links on recommendation pages may direct you to third-party sites
              like Amazon.com. When you visit those sites, their own privacy policies apply.
              Shops may use affiliate links, which means they may earn a small commission
              if you make a purchase — at no additional cost to you.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">Data Retention</h2>
            <p className="text-gray-600">
              Anonymized scan and click data is retained for analytics purposes. Since no
              personally identifiable information is stored, there is no personal data to
              delete.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">Contact</h2>
            <p className="text-gray-600">
              If you have questions about this privacy notice, please contact the shop
              that provided the QR code, or reach out via the platform.
            </p>
          </section>
        </div>

        <p className="text-xs text-gray-400 mt-8">
          Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long" })}
        </p>
      </div>
    </div>
  );
}
