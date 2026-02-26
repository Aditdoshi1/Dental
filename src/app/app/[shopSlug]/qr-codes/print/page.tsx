import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";
import { resolveShopContext } from "@/lib/permissions";
import { redirect } from "next/navigation";
import PrintButton from "@/components/admin/PrintButton";
import type { QrCode, Collection } from "@/types/database";

interface Props {
  params: Promise<{ shopSlug: string }>;
}

export default async function PrintQrSheet({ params }: Props) {
  const { shopSlug } = await params;
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ctx = await resolveShopContext(supabase, shopSlug, user.id);
  if (!ctx) redirect("/setup");

  const { data: qrCodes } = await supabase
    .from("qr_codes")
    .select("*, collections(title)")
    .eq("shop_id", ctx.shop.id)
    .order("created_at", { ascending: false })
    .returns<(QrCode & { collections: Pick<Collection, "title"> })[]>();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  return (
    <div>
      <div className="no-print flex items-center justify-between mb-6">
        <div>
          <Link href={`/app/${shopSlug}/qr-codes`} className="text-sm text-gray-500 hover:text-gray-700">
            ← Back to QR Codes
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Printable QR Sheet</h1>
        </div>
        <PrintButton />
      </div>

      {!qrCodes || qrCodes.length === 0 ? (
        <p className="text-gray-500">No QR codes to print.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 print:grid-cols-3 print:gap-4">
          {qrCodes.map((qr) => (
            <div key={qr.id} className="border border-gray-200 rounded-lg p-4 text-center print:border-black">
              {qr.qr_png_path && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={`${supabaseUrl}/storage/v1/object/public/qr-codes/${qr.qr_png_path}`}
                  alt={qr.label}
                  className="w-36 h-36 mx-auto mb-2"
                />
              )}
              <p className="font-semibold text-sm text-gray-900">{qr.label}</p>
              <p className="text-xs text-gray-500">{ctx.shop.name}</p>
              <p className="text-xs text-gray-400 mt-1">Scan to see recommendations</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
