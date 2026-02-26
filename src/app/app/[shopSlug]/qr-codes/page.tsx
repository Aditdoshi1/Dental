import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";
import { resolveShopContext } from "@/lib/permissions";
import { formatDate } from "@/lib/utils";
import { redirect } from "next/navigation";
import type { QrCode, Collection, Item } from "@/types/database";

interface Props {
  params: Promise<{ shopSlug: string }>;
}

type QrWithRelations = QrCode & {
  collections: Pick<Collection, "title" | "slug"> | null;
  items: Pick<Item, "title"> | null;
};

export default async function QrCodesPage({ params }: Props) {
  const { shopSlug } = await params;
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ctx = await resolveShopContext(supabase, shopSlug, user.id);
  if (!ctx) redirect("/setup");

  const base = `/app/${shopSlug}`;

  const { data: qrCodes } = await supabase
    .from("qr_codes")
    .select("*, collections(title, slug), items(title)")
    .eq("shop_id", ctx.shop.id)
    .order("created_at", { ascending: false })
    .returns<QrWithRelations[]>();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">QR Codes</h1>
          <p className="text-sm text-slate-500 mt-1">All QR codes for collections and standalone products</p>
        </div>
        <Link href={`${base}/qr-codes/print`} className="btn-secondary">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
          Print Sheet
        </Link>
      </div>

      {!qrCodes || qrCodes.length === 0 ? (
        <div className="card text-center py-14">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
          </div>
          <p className="text-slate-500 mb-1">No QR codes yet</p>
          <p className="text-sm text-slate-400 mb-5">Create a collection or product to generate one</p>
          <div className="flex gap-2 justify-center">
            <Link href={`${base}/collections`} className="btn-primary text-sm">Collections</Link>
            <Link href={`${base}/products`} className="btn-secondary text-sm">Products</Link>
          </div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {qrCodes.map((qr) => {
            const isProduct = !!qr.item_id;
            const displayName = isProduct ? qr.items?.title : qr.collections?.title;
            const typeLabel = isProduct ? "Product" : "Collection";

            return (
              <div key={qr.id} className="card-hover">
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-900 truncate">{qr.label}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                        isProduct ? "bg-purple-50 text-purple-600" : "bg-brand-50 text-brand-600"
                      }`}>
                        {typeLabel}
                      </span>
                      {displayName && <p className="text-xs text-slate-500 truncate">{displayName}</p>}
                    </div>
                  </div>
                </div>

                {qr.qr_png_path && (
                  <div className="bg-white border border-slate-100 rounded-xl p-5 mb-3 flex justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`${supabaseUrl}/storage/v1/object/public/qr-codes/${qr.qr_png_path}`}
                      alt={`QR for ${qr.label}`}
                      className="w-36 h-36"
                    />
                  </div>
                )}

                <div className="text-xs text-slate-400 space-y-0.5 mb-3">
                  <p>Created: {formatDate(qr.created_at)}</p>
                </div>

                <div className="flex gap-2">
                  {qr.qr_png_path && (
                    <a
                      href={`${supabaseUrl}/storage/v1/object/public/qr-codes/${qr.qr_png_path}`}
                      download={`${qr.label}-qr.png`}
                      className="btn-primary text-xs flex-1 text-center py-2"
                    >
                      Download PNG
                    </a>
                  )}
                  {qr.qr_svg_path && (
                    <a
                      href={`${supabaseUrl}/storage/v1/object/public/qr-codes/${qr.qr_svg_path}`}
                      download={`${qr.label}-qr.svg`}
                      className="btn-secondary text-xs flex-1 text-center py-2"
                    >
                      Download SVG
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
