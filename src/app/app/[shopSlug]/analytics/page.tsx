import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";
import { resolveShopContext } from "@/lib/permissions";
import { formatNumber } from "@/lib/utils";
import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ shopSlug: string }>;
}

export default async function AnalyticsPage({ params }: Props) {
  const { shopSlug } = await params;
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ctx = await resolveShopContext(supabase, shopSlug, user.id);
  if (!ctx) redirect("/setup");

  const base = `/app/${shopSlug}`;
  const shopId = ctx.shop.id;

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();

  // Pre-fetch IDs
  const [{ data: qrIds }, { data: collIds }] = await Promise.all([
    supabase.from("qr_codes").select("id").eq("shop_id", shopId),
    supabase.from("collections").select("id").eq("shop_id", shopId),
  ]);

  const qrIdList = (qrIds || []).map((q) => q.id);
  const collIdList = (collIds || []).map((c) => c.id);

  const [
    { count: totalScans },
    { count: scans7d },
    { count: scans30d },
    { count: totalClicks },
    { count: clicks7d },
    { count: clicks30d },
  ] = await Promise.all([
    qrIdList.length > 0
      ? supabase.from("scan_events").select("*", { count: "exact", head: true }).in("qr_code_id", qrIdList)
      : Promise.resolve({ count: 0 }),
    qrIdList.length > 0
      ? supabase.from("scan_events").select("*", { count: "exact", head: true }).in("qr_code_id", qrIdList).gte("scanned_at", sevenDaysAgo)
      : Promise.resolve({ count: 0 }),
    qrIdList.length > 0
      ? supabase.from("scan_events").select("*", { count: "exact", head: true }).in("qr_code_id", qrIdList).gte("scanned_at", thirtyDaysAgo)
      : Promise.resolve({ count: 0 }),
    collIdList.length > 0
      ? supabase.from("click_events").select("*", { count: "exact", head: true }).in("collection_id", collIdList)
      : Promise.resolve({ count: 0 }),
    collIdList.length > 0
      ? supabase.from("click_events").select("*", { count: "exact", head: true }).in("collection_id", collIdList).gte("clicked_at", sevenDaysAgo)
      : Promise.resolve({ count: 0 }),
    collIdList.length > 0
      ? supabase.from("click_events").select("*", { count: "exact", head: true }).in("collection_id", collIdList).gte("clicked_at", thirtyDaysAgo)
      : Promise.resolve({ count: 0 }),
  ]);

  // Scans per QR code (30d)
  let topQrScans: { code: string; label: string; count: number }[] = [];
  if (qrIdList.length > 0) {
    const { data: recentScans } = await supabase
      .from("scan_events")
      .select("qr_code_id, qr_codes(code, label)")
      .in("qr_code_id", qrIdList)
      .gte("scanned_at", thirtyDaysAgo)
      .order("scanned_at", { ascending: false })
      .limit(500);

    const scansByQr: Record<string, { code: string; label: string; count: number }> = {};
    if (recentScans) {
      for (const scan of recentScans) {
        const qr = scan.qr_codes as unknown as { code: string; label: string } | null;
        const key = scan.qr_code_id;
        if (!scansByQr[key]) scansByQr[key] = { code: qr?.code || "", label: qr?.label || "", count: 0 };
        scansByQr[key].count++;
      }
    }
    topQrScans = Object.values(scansByQr).sort((a, b) => b.count - a.count).slice(0, 20);
  }

  // Clicks per item (30d)
  let topItemClicks: { title: string; count: number }[] = [];
  if (collIdList.length > 0) {
    const { data: recentClicks } = await supabase
      .from("click_events")
      .select("item_id, items(title)")
      .in("collection_id", collIdList)
      .gte("clicked_at", thirtyDaysAgo)
      .order("clicked_at", { ascending: false })
      .limit(500);

    const clicksByItem: Record<string, { title: string; count: number }> = {};
    if (recentClicks) {
      for (const click of recentClicks) {
        const item = click.items as unknown as { title: string } | null;
        const key = click.item_id;
        if (!clicksByItem[key]) clicksByItem[key] = { title: item?.title || "", count: 0 };
        clicksByItem[key].count++;
      }
    }
    topItemClicks = Object.values(clicksByItem).sort((a, b) => b.count - a.count).slice(0, 20);
  }

  const conversionRate = (scans30d ?? 0) > 0
    ? (((clicks30d ?? 0) / (scans30d ?? 1)) * 100).toFixed(1)
    : "0.0";

  const statItems = [
    { label: "Total Scans", value: totalScans ?? 0, color: "text-brand-600" },
    { label: "Scans (7d)", value: scans7d ?? 0, color: "text-brand-600" },
    { label: "Scans (30d)", value: scans30d ?? 0, color: "text-brand-600" },
    { label: "Total Clicks", value: totalClicks ?? 0, color: "text-amber-600" },
    { label: "Clicks (7d)", value: clicks7d ?? 0, color: "text-amber-600" },
    { label: "Clicks (30d)", value: clicks30d ?? 0, color: "text-amber-600" },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">Track QR scans and product clicks</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/api/export?type=scans&shop=${shopId}`} className="btn-secondary text-sm" target="_blank">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Scans CSV
          </Link>
          <Link href={`/api/export?type=clicks&shop=${shopId}`} className="btn-secondary text-sm" target="_blank">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Clicks CSV
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        {statItems.map((s) => (
          <div key={s.label} className="card">
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">{s.label}</p>
            <p className={`text-xl font-bold mt-1 ${s.color}`}>{formatNumber(s.value)}</p>
          </div>
        ))}
      </div>

      {/* Funnel */}
      <div className="card mb-8">
        <h2 className="font-semibold text-slate-900 mb-5">30-Day Funnel</h2>
        <div className="flex items-center justify-center gap-6 sm:gap-10">
          <div className="text-center">
            <p className="text-3xl font-bold text-brand-600">{formatNumber(scans30d ?? 0)}</p>
            <p className="text-xs text-slate-500 mt-1 font-medium">QR Scans</p>
          </div>
          <div className="flex flex-col items-center gap-1">
            <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-amber-600">{formatNumber(clicks30d ?? 0)}</p>
            <p className="text-xs text-slate-500 mt-1 font-medium">Product Clicks</p>
          </div>
          <div className="flex flex-col items-center gap-1">
            <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-emerald-600">{conversionRate}%</p>
            <p className="text-xs text-slate-500 mt-1 font-medium">Click Rate</p>
          </div>
        </div>
      </div>

      {/* Breakdown Tables */}
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="card">
          <h2 className="font-semibold text-slate-900 mb-4">Scans by QR Code (30d)</h2>
          {topQrScans.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">No scan data yet</p>
          ) : (
            <div className="space-y-2.5">
              {topQrScans.map((qr) => (
                <div key={qr.code} className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 truncate">{qr.label}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{qr.code}</p>
                  </div>
                  <div className="flex items-center gap-2.5 flex-shrink-0">
                    <div className="w-20 bg-slate-100 rounded-full h-1.5">
                      <div
                        className="bg-brand-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${Math.min(100, (qr.count / (topQrScans[0]?.count || 1)) * 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-slate-700 w-8 text-right tabular-nums">{qr.count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="font-semibold text-slate-900 mb-4">Clicks by Product (30d)</h2>
          {topItemClicks.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">No click data yet</p>
          ) : (
            <div className="space-y-2.5">
              {topItemClicks.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <p className="text-sm font-medium text-slate-900 truncate min-w-0 flex-1">{item.title}</p>
                  <div className="flex items-center gap-2.5 flex-shrink-0">
                    <div className="w-20 bg-slate-100 rounded-full h-1.5">
                      <div
                        className="bg-amber-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${Math.min(100, (item.count / (topItemClicks[0]?.count || 1)) * 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-slate-700 w-8 text-right tabular-nums">{item.count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
