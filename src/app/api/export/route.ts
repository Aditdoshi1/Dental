import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { arrayToCsv } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const type = request.nextUrl.searchParams.get("type");
  const shopId = request.nextUrl.searchParams.get("shop");

  if (!shopId) return new NextResponse("Missing shop parameter", { status: 400 });

  // Verify user is a member of this shop
  const { data: membership } = await supabase
    .from("shop_members")
    .select("id")
    .eq("shop_id", shopId)
    .eq("user_id", user.id)
    .eq("accepted", true)
    .single();

  if (!membership) return new NextResponse("Unauthorized for this shop", { status: 403 });

  if (type === "scans") {
    const { data: qrIds } = await supabase.from("qr_codes").select("id").eq("shop_id", shopId);
    const ids = (qrIds || []).map((q) => q.id);

    const { data } = await supabase
      .from("scan_events")
      .select("id, qr_code_id, scanned_at, device_type, referrer, ip_hash, qr_codes(code, label)")
      .in("qr_code_id", ids)
      .order("scanned_at", { ascending: false })
      .limit(10000);

    const rows = (data || []).map((row) => {
      const qr = row.qr_codes as unknown as { code: string; label: string } | null;
      return {
        id: row.id,
        qr_code: qr?.code || "",
        qr_label: qr?.label || "",
        scanned_at: row.scanned_at,
        device_type: row.device_type,
        referrer: row.referrer,
        ip_hash: row.ip_hash,
      };
    });

    return new NextResponse(arrayToCsv(rows), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="scan_events_${Date.now()}.csv"`,
      },
    });
  }

  if (type === "clicks") {
    const { data: collIds } = await supabase.from("collections").select("id").eq("shop_id", shopId);
    const ids = (collIds || []).map((c) => c.id);

    const { data } = await supabase
      .from("click_events")
      .select("id, collection_id, item_id, clicked_at, items(title), collections(title)")
      .in("collection_id", ids)
      .order("clicked_at", { ascending: false })
      .limit(10000);

    const rows = (data || []).map((row) => {
      const item = row.items as unknown as { title: string } | null;
      const collection = row.collections as unknown as { title: string } | null;
      return {
        id: row.id,
        collection: collection?.title || "",
        item: item?.title || "",
        clicked_at: row.clicked_at,
      };
    });

    return new NextResponse(arrayToCsv(rows), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="click_events_${Date.now()}.csv"`,
      },
    });
  }

  return new NextResponse("Invalid type. Use ?type=scans or ?type=clicks", { status: 400 });
}
