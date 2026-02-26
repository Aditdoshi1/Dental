import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";
import { resolveShopContext } from "@/lib/permissions";
import { formatNumber } from "@/lib/utils";
import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ shopSlug: string }>;
}

export default async function DashboardPage({ params }: Props) {
  const { shopSlug } = await params;
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ctx = await resolveShopContext(supabase, shopSlug, user.id);
  if (!ctx) redirect("/setup");

  const shopId = ctx.shop.id;
  const base = `/app/${shopSlug}`;

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();

  // Pre-fetch IDs to avoid nested queries inside Promise.all
  const [{ data: qrIds }, { data: collIds }] = await Promise.all([
    supabase.from("qr_codes").select("id").eq("shop_id", shopId),
    supabase.from("collections").select("id").eq("shop_id", shopId),
  ]);

  const qrIdList = (qrIds || []).map((q) => q.id);
  const collIdList = (collIds || []).map((c) => c.id);

  const [
    { count: totalCollections },
    { count: totalItems },
    { count: totalQrCodes },
    { count: scans7d },
    { count: clicks7d },
  ] = await Promise.all([
    supabase.from("collections").select("*", { count: "exact", head: true }).eq("shop_id", shopId),
    supabase.from("items").select("*", { count: "exact", head: true }).eq("shop_id", shopId),
    supabase.from("qr_codes").select("*", { count: "exact", head: true }).eq("shop_id", shopId),
    qrIdList.length > 0
      ? supabase.from("scan_events").select("*", { count: "exact", head: true }).in("qr_code_id", qrIdList).gte("scanned_at", sevenDaysAgo)
      : Promise.resolve({ count: 0 }),
    collIdList.length > 0
      ? supabase.from("click_events").select("*", { count: "exact", head: true }).in("collection_id", collIdList).gte("clicked_at", sevenDaysAgo)
      : Promise.resolve({ count: 0 }),
  ]);

  const stats = [
    { label: "Collections", value: totalCollections ?? 0, href: `${base}/collections`, color: "text-brand-600 dark:text-brand-400", bg: "bg-brand-50 dark:bg-brand-900/30" },
    { label: "Products", value: totalItems ?? 0, href: `${base}/collections`, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/30" },
    { label: "QR Codes", value: totalQrCodes ?? 0, href: `${base}/qr-codes`, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-900/30" },
    { label: "Scans (7d)", value: scans7d ?? 0, href: `${base}/analytics`, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/30" },
    { label: "Clicks (7d)", value: clicks7d ?? 0, href: `${base}/analytics`, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/30" },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Welcome back to <span className="font-medium text-slate-700 dark:text-slate-300">{ctx.shop.name}</span>
          </p>
        </div>
        <Link href={`${base}/collections/new`} className="btn-primary">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          New Collection
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
        {stats.map((stat, i) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="card-hover group"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{stat.label}</p>
              <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center`}>
                <span className={`text-xs font-bold ${stat.color}`}>
                  {stat.label.charAt(0)}
                </span>
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              {formatNumber(stat.value)}
            </p>
          </Link>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        {/* Quick Actions */}
        <div className="card">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">Quick Actions</h2>
          <div className="space-y-1">
            {[
              { href: `${base}/collections/new`, label: "Create a new collection", desc: "Set up product recommendations" },
              { href: `${base}/qr-codes`, label: "View & download QR codes", desc: "Print codes for your shop" },
              { href: `${base}/analytics`, label: "View analytics", desc: "Track scans and clicks" },
              ...(ctx.role === "owner" || ctx.role === "admin"
                ? [{ href: `${base}/team`, label: "Manage team", desc: "Invite and manage members" }]
                : []),
            ].map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 group-hover:text-brand-700 dark:group-hover:text-brand-400 transition-colors">
                    {action.label}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{action.desc}</p>
                </div>
                <svg className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        </div>

        {/* How It Works */}
        <div className="card">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">How It Works</h2>
          <div className="space-y-3">
            {[
              { step: "1", text: "Create a collection of recommended products", color: "bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300" },
              { step: "2", text: "Paste product links — images & titles auto-fetch", color: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" },
              { step: "3", text: "Generate a QR code for the collection", color: "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300" },
              { step: "4", text: "Print and display in your shop", color: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300" },
              { step: "5", text: "Track scans & clicks in analytics", color: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300" },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-3">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${item.color}`}>
                  {item.step}
                </span>
                <p className="text-sm text-slate-600 dark:text-slate-400 pt-0.5">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
