import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashIp } from "@/lib/privacy";
import { detectDeviceType } from "@/lib/utils";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code } = body;

    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Missing code" }, { status: 400 });
    }

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { allowed } = checkRateLimit(`scan:${ip}`);
    if (!allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const supabase = createAdminClient();
    const { data: qrCode, error } = await supabase
      .from("qr_codes")
      .select("id")
      .eq("code", code.trim())
      .single();

    if (error || !qrCode) {
      return NextResponse.json({ error: "Invalid code" }, { status: 404 });
    }

    const userAgent = request.headers.get("user-agent") || "";
    const referrer = request.headers.get("referer") || "";
    const deviceType = detectDeviceType(userAgent);
    const ipHash = hashIp(ip);

    await supabase.from("scan_events").insert({
      qr_code_id: qrCode.id,
      scanned_at: new Date().toISOString(),
      user_agent: userAgent.slice(0, 500),
      device_type: deviceType,
      referrer: referrer.slice(0, 500),
      ip_hash: ipHash,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
