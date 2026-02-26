import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const { email, collection_id } = await request.json();

    if (!email || !collection_id) {
      return NextResponse.json({ error: "Email and collection_id are required" }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Verify collection exists and is active
    const { data: collection } = await supabase
      .from("collections")
      .select("id")
      .eq("id", collection_id)
      .eq("active", true)
      .single();

    if (!collection) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }

    // Upsert subscriber (re-subscribe if previously unsubscribed)
    const { error } = await supabase
      .from("collection_subscribers")
      .upsert(
        { collection_id, email: email.toLowerCase().trim(), unsubscribed: false },
        { onConflict: "collection_id,email" }
      );

    if (error) {
      return NextResponse.json({ error: "Failed to subscribe" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to subscribe" }, { status: 500 });
  }
}
