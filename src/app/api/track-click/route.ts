import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { collection_id, item_id, qr_code_id } = body;

    if (!item_id) {
      return NextResponse.json({ error: "Missing item_id" }, { status: 400 });
    }

    const userAgent = request.headers.get("user-agent") || "";
    const supabase = createAdminClient();

    await supabase.from("click_events").insert({
      qr_code_id: qr_code_id || null,
      collection_id: collection_id || null,
      item_id,
      clicked_at: new Date().toISOString(),
      user_agent: userAgent.slice(0, 500),
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
