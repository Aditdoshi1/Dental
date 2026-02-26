import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashIp } from "@/lib/privacy";
import { detectDeviceType } from "@/lib/utils";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const { allowed } = checkRateLimit(`scan:${ip}`);
  if (!allowed) {
    return new NextResponse("Too many requests", { status: 429 });
  }

  const supabase = createAdminClient();

  const { data: qrCode, error } = await supabase
    .from("qr_codes")
    .select("id, code, redirect_path, collection_id, item_id, collections(slug, shops(slug)), items(id, shop_id, shops(slug))")
    .eq("code", code)
    .single();

  if (error || !qrCode) {
    return new NextResponse("QR code not found", { status: 404 });
  }

  // Log scan event (non-blocking)
  const userAgent = request.headers.get("user-agent") || "";
  const referrer = request.headers.get("referer") || "";
  const deviceType = detectDeviceType(userAgent);
  const ipHash = hashIp(ip);

  supabase.from("scan_events").insert({
    qr_code_id: qrCode.id,
    scanned_at: new Date().toISOString(),
    user_agent: userAgent.slice(0, 500),
    device_type: deviceType,
    referrer: referrer.slice(0, 500),
    ip_hash: ipHash,
  }).then(() => {});

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  let redirectUrl: string;

  if (qrCode.collection_id) {
    // Collection QR code → redirect to collection landing page
    const collections = qrCode.collections as unknown as {
      slug: string;
      shops: { slug: string };
    } | null;

    if (collections?.shops?.slug && collections?.slug) {
      redirectUrl = `${baseUrl}/s/${collections.shops.slug}/${collections.slug}?src=${code}`;
    } else {
      redirectUrl = `${baseUrl}${qrCode.redirect_path}?src=${code}`;
    }
  } else if (qrCode.item_id) {
    // Product QR code → redirect to single-product landing page
    const items = qrCode.items as unknown as {
      id: string;
      shop_id: string;
      shops: { slug: string };
    } | null;

    if (items?.shops?.slug) {
      redirectUrl = `${baseUrl}/p/${items.shops.slug}/${qrCode.item_id}?src=${code}`;
    } else {
      redirectUrl = `${baseUrl}${qrCode.redirect_path}?src=${code}`;
    }
  } else {
    redirectUrl = `${baseUrl}${qrCode.redirect_path}?src=${code}`;
  }

  return NextResponse.redirect(redirectUrl, 302);
}
