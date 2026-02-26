import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import ProductCard from "@/components/public/ProductCard";
import SubscribeForm from "@/components/public/SubscribeForm";
import TrackScanOnLanding from "@/components/public/TrackScanOnLanding";
import type { Collection, Item, QrCode, Shop } from "@/types/database";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ shopSlug: string; collectionSlug: string }>;
  searchParams: Promise<{ src?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { shopSlug, collectionSlug } = await params;
  const supabase = createAdminClient();

  const { data: shop } = await supabase
    .from("shops")
    .select("name")
    .eq("slug", shopSlug)
    .single();

  const { data: collection } = await supabase
    .from("collections")
    .select("title, description, shop_id")
    .eq("slug", collectionSlug)
    .eq("active", true)
    .single();

  if (!shop || !collection) return { title: "Not Found" };

  return {
    title: `${collection.title} – ${shop.name}`,
    description: collection.description || `Products recommended by ${shop.name}`,
  };
}

export default async function CollectionLandingPage({ params, searchParams }: Props) {
  const { shopSlug, collectionSlug } = await params;
  const { src } = await searchParams;
  const supabase = createAdminClient();

  const { data: shop } = await supabase
    .from("shops")
    .select("*")
    .eq("slug", shopSlug)
    .single<Shop>();

  if (!shop) notFound();

  const { data: collection } = await supabase
    .from("collections")
    .select("*")
    .eq("shop_id", shop.id)
    .eq("slug", collectionSlug)
    .eq("active", true)
    .single<Collection>();

  if (!collection) notFound();

  const { data: items } = await supabase
    .from("items")
    .select("*")
    .eq("collection_id", collection.id)
    .eq("active", true)
    .order("sort_order", { ascending: true })
    .returns<Item[]>();

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

  return (
    <div
      className="min-h-screen"
      style={{
        background: `linear-gradient(180deg, ${primaryColor}08 0%, white 40%, ${primaryColor}04 100%)`,
      }}
    >
      <TrackScanOnLanding srcCode={src} />
      <div className="max-w-2xl mx-auto px-4 py-10 sm:py-16">
        {/* Header */}
        <div className="text-center mb-10">
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
            <span className="text-sm text-slate-600 font-medium">Recommended by <span className="text-slate-900">{shop.name}</span></span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            {collection.title}
          </h1>
          {collection.description && (
            <p className="text-slate-500 mt-3 max-w-md mx-auto text-lg leading-relaxed">
              {collection.description}
            </p>
          )}
        </div>

        {/* Products */}
        {!items || items.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl ring-1 ring-slate-950/[0.05]">
            <p className="text-slate-400">No products available at this time.</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {items.map((item) => (
              <ProductCard
                key={item.id}
                item={item}
                collectionId={collection.id}
                qrCodeId={qrCodeId}
                buttonColor={secondaryColor}
              />
            ))}
          </div>
        )}

        {/* Subscribe */}
        <div className="mt-10">
          <SubscribeForm
            collectionId={collection.id}
            collectionTitle={collection.title}
            primaryColor={primaryColor}
          />
        </div>

        {/* Footer */}
        <footer className="mt-14 pt-8 border-t border-slate-200/80">
          <div className="bg-amber-50/80 border border-amber-200/60 rounded-xl p-4 mb-6">
            <p className="text-xs text-amber-800 leading-relaxed">
              <strong>Affiliate Disclosure:</strong> Some links on this page are affiliate links.
              If you click and make a purchase, we may earn a small commission at no extra cost to you.
              We only recommend products we genuinely believe in.
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
