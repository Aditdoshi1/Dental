import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveShopContext, canEditCollection } from "@/lib/permissions";
import CollectionForm from "@/components/admin/CollectionForm";
import ItemManager from "@/components/admin/ItemManager";
import SharePanel from "@/components/admin/SharePanel";
import { notFound, redirect } from "next/navigation";
import type { Collection, Item, QrCode, CollectionShare, Profile } from "@/types/database";

interface Props {
  params: Promise<{ shopSlug: string; id: string }>;
}

export default async function CollectionDetailPage({ params }: Props) {
  const { shopSlug, id } = await params;
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ctx = await resolveShopContext(supabase, shopSlug, user.id);
  if (!ctx) redirect("/setup");

  const base = `/app/${shopSlug}`;

  const { data: collection } = await supabase
    .from("collections")
    .select("*")
    .eq("id", id)
    .single<Collection>();

  if (!collection) notFound();

  const admin = createAdminClient();

  const [
    { data: items },
    { data: qrCodes },
    { data: shares },
    { data: teamMembers },
    { count: subscriberCount },
  ] = await Promise.all([
    supabase.from("items").select("*").eq("collection_id", id).order("sort_order", { ascending: true }).returns<Item[]>(),
    supabase.from("qr_codes").select("*").eq("collection_id", id).order("created_at", { ascending: false }).limit(1).returns<QrCode[]>(),
    supabase.from("collection_shares").select("*, profiles(display_name, email)").eq("collection_id", id),
    supabase.from("shop_members").select("user_id, profiles(display_name, email)").eq("shop_id", ctx.shop.id).eq("accepted", true),
    admin.from("collection_subscribers").select("*", { count: "exact", head: true }).eq("collection_id", id).eq("unsubscribed", false),
  ]);

  const sharesList = (shares || []) as unknown as (CollectionShare & { profiles: Pick<Profile, "display_name" | "email"> })[];
  const userCanEdit = canEditCollection(collection, user.id, ctx.role, sharesList);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const qr = qrCodes && qrCodes.length > 0 ? qrCodes[0] : null;

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-6">
        <nav className="flex items-center gap-1.5 text-sm">
          <Link href={`${base}/collections`} className="text-slate-400 hover:text-slate-600 transition-colors">
            Collections
          </Link>
          <svg className="w-3.5 h-3.5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-slate-700 font-medium">{collection.title}</span>
        </nav>
        <div className="flex items-center gap-2.5 mt-3">
          <h1 className="text-2xl font-bold text-slate-900">{collection.title}</h1>
          {collection.visibility === "personal" && <span className="badge-purple">Personal</span>}
          {!collection.active && <span className="badge-gray">Inactive</span>}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          <CollectionForm
            collection={collection}
            shopSlug={shopSlug}
            shopId={ctx.shop.id}
            role={ctx.role}
          />
          <ItemManager
            shopSlug={shopSlug}
            shopId={ctx.shop.id}
            collectionId={id}
            items={items || []}
            canEdit={userCanEdit}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* QR Code */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-4 h-4 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              <h2 className="font-semibold text-slate-900">QR Code</h2>
            </div>
            {!qr ? (
              <div className="text-center py-6">
                <p className="text-sm text-slate-400">QR code is being generated...</p>
                <p className="text-xs text-slate-300 mt-1">Refresh the page in a moment</p>
              </div>
            ) : (
              <div>
                {qr.qr_png_path && (
                  <div className="bg-white border border-slate-100 rounded-xl p-6 flex justify-center mb-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`${supabaseUrl}/storage/v1/object/public/qr-codes/${qr.qr_png_path}`}
                      alt={`QR for ${collection.title}`}
                      className="w-48 h-48"
                    />
                  </div>
                )}
                <p className="text-xs text-center text-slate-400 mb-3">
                  Print this QR code and display it in your clinic
                </p>
                <div className="flex gap-2">
                  {qr.qr_png_path && (
                    <a
                      href={`${supabaseUrl}/storage/v1/object/public/qr-codes/${qr.qr_png_path}`}
                      download={`${collection.title}-qr.png`}
                      className="btn-primary text-xs flex-1 text-center py-2"
                    >
                      Download PNG
                    </a>
                  )}
                  {qr.qr_svg_path && (
                    <a
                      href={`${supabaseUrl}/storage/v1/object/public/qr-codes/${qr.qr_svg_path}`}
                      download={`${collection.title}-qr.svg`}
                      className="btn-secondary text-xs flex-1 text-center py-2"
                    >
                      Download SVG
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Subscribers */}
          <div className="card">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <h2 className="font-semibold text-slate-900">Subscribers</h2>
            </div>
            <p className="text-2xl font-bold text-slate-900">{subscriberCount ?? 0}</p>
            <p className="text-xs text-slate-400 mt-1">
              People subscribed to get notified when you add new products
            </p>
          </div>

          {/* Sharing */}
          {collection.visibility === "personal" && (
            <SharePanel
              shopSlug={shopSlug}
              collectionId={id}
              shares={sharesList}
              teamMembers={(teamMembers || []) as unknown as { user_id: string; profiles: Pick<Profile, "display_name" | "email"> }[]}
              currentUserId={user.id}
            />
          )}

          {/* Public Link */}
          <div className="card">
            <h2 className="font-semibold text-slate-900 mb-3">Public Link</h2>
            <div className="bg-slate-50 rounded-lg p-3 ring-1 ring-slate-200">
              <code className="text-xs text-brand-700 break-all font-mono leading-relaxed">
                {appUrl}/s/{ctx.shop.slug}/{collection.slug}
              </code>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              This is the page customers see when they scan the QR code
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
