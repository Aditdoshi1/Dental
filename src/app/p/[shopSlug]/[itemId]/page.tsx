import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Item, Shop, QrCode } from "@/types/database";
import type { Metadata } from "next";
import TrackScanOnLanding from "@/components/public/TrackScanOnLanding";

interface Props {
  params: Promise<{ shopSlug: string; itemId: string }>;
  searchParams: Promise<{ src?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { shopSlug, itemId } = await params;
  const supabase = createAdminClient();

  const { data: shop } = await supabase.from("shops").select("name").eq("slug", shopSlug).single();
  const { data: item } = await supabase.from("items").select("title, note").eq("id", itemId).eq("active", true).single();

  if (!shop || !item) return { title: "Not Found" };

  return {
    title: `${item.title} – ${shop.name}`,
    description: item.note || `Recommended by ${shop.name}`,
  };
}

export default async function ProductLandingPage({ params, searchParams }: Props) {
  const { shopSlug, itemId } = await params;
  const { src } = await searchParams;
  const supabase = createAdminClient();

  const { data: shop } = await supabase
    .from("shops")
    .select("*")
    .eq("slug", shopSlug)
    .single<Shop>();

  if (!shop) notFound();

  const { data: item } = await supabase
    .from("items")
    .select("*")
    .eq("id", itemId)
    .eq("shop_id", shop.id)
    .eq("active", true)
    .single<Item>();

  if (!item) notFound();

  let qrCodeId: string | undefined;
  if (src) {
    const { data: qr } = await supabase
      .from("qr_codes")
      .select("id")
      .eq("code", src)
      .single<Pick<QrCode, "id">>();
    qrCodeId = qr?.id;
  }

  const primaryColor = shop.primary_color || "#14b8a6";
  const secondaryColor = shop.secondary_color || "#f59e0b";

  const trackAndRedirect = `
    fetch('/api/track-click', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({item_id:'${item.id}',qr_code_id:${qrCodeId ? `'${qrCodeId}'` : 'null'}})
    }).catch(()=>{});
    setTimeout(()=>window.open('${item.product_url}','_blank','noopener,noreferrer'),150);
    return false;
  `;

  return (
    <div
      className="min-h-screen"
      style={{
        background: `linear-gradient(180deg, ${primaryColor}08 0%, white 40%, ${primaryColor}04 100%)`,
      }}
    >
      <TrackScanOnLanding srcCode={src} />
      <div className="max-w-lg mx-auto px-4 py-10 sm:py-16">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 shadow-sm ring-1 ring-slate-950/[0.05] mb-5">
            {shop.logo_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={shop.logo_url} alt={shop.name} className="w-6 h-6 rounded-lg object-cover" />
            ) : (
              <span
                className="w-6 h-6 rounded-lg text-[11px] font-bold flex items-center justify-center text-white"
                style={{ backgroundColor: primaryColor }}
              >
                {shop.name.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="text-sm text-slate-600 font-medium">
              Recommended by <span className="text-slate-900">{shop.name}</span>
            </span>
          </div>
        </div>

        {/* Product card */}
        <div className="bg-white rounded-2xl shadow-lg ring-1 ring-slate-950/[0.05] overflow-hidden">
          {item.image_url ? (
            <div className="aspect-[16/10] overflow-hidden bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.image_url}
                alt={item.title}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="aspect-[16/10] bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center">
              <div className="w-20 h-20 rounded-2xl bg-white shadow-sm flex items-center justify-center">
                <svg className="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            </div>
          )}

          <div className="p-6 sm:p-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">
              {item.title}
            </h1>
            {item.note && (
              <p className="text-slate-500 mt-3 text-base leading-relaxed">
                {item.note}
              </p>
            )}

            {/* CTA */}
            <button
              onClick={undefined}
              style={{ backgroundColor: secondaryColor }}
              className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-xl px-6 py-4 text-base font-semibold text-white shadow-sm hover:opacity-90 active:opacity-80 transition-all duration-150 cursor-pointer"
              // Use inline script for onClick because this is a server component
            >
              <script dangerouslySetInnerHTML={{
                __html: `document.currentScript.parentElement.addEventListener('click',function(){${trackAndRedirect}});`
              }} />
              View Product
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </button>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 pt-8 border-t border-slate-200/80">
          <div className="bg-amber-50/80 border border-amber-200/60 rounded-xl p-4 mb-6">
            <p className="text-xs text-amber-800 leading-relaxed">
              <strong>Affiliate Disclosure:</strong> This link may be an affiliate link.
              If you click and make a purchase, we may earn a small commission at no extra cost to you.
            </p>
          </div>
          <div className="flex items-center justify-center gap-4 text-xs text-slate-400">
            <Link href="/privacy" className="hover:text-slate-600 transition-colors">Privacy Notice</Link>
            <span>&middot;</span>
            <span>Powered by <span className="font-medium">QRShelf</span></span>
          </div>
        </footer>
      </div>
    </div>
  );
}
