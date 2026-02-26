import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";
import { nanoid } from "nanoid";

export default async function SetupPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Check if user already belongs to a shop
  const { data: memberships } = await supabase
    .from("shop_members")
    .select("shop_id, shops(slug)")
    .eq("user_id", user.id)
    .eq("accepted", true)
    .limit(1);

  if (memberships && memberships.length > 0) {
    const shopSlug = (memberships[0].shops as unknown as { slug: string })?.slug;
    if (shopSlug) redirect(`/app/${shopSlug}/dashboard`);
  }

  // Check for pending invites and auto-accept the first one
  const { data: invites } = await supabase
    .from("shop_members")
    .select("id, shop_id, invited_email, shops(slug)")
    .eq("invited_email", user.email)
    .eq("accepted", false)
    .limit(1);

  if (invites && invites.length > 0) {
    await supabase
      .from("shop_members")
      .update({ user_id: user.id, accepted: true })
      .eq("id", invites[0].id);
    const shopSlug = (invites[0].shops as unknown as { slug: string })?.slug;
    if (shopSlug) redirect(`/app/${shopSlug}/dashboard`);
  }

  // No shop exists — auto-create "Dental" shop
  const name = "Dental";
  let slug = slugify(name);

  const { data: existing } = await supabase
    .from("shops")
    .select("id")
    .eq("slug", slug)
    .single();

  if (existing) slug = `${slug}-${nanoid(4)}`;

  const { data: shop, error: shopErr } = await supabase
    .from("shops")
    .insert({
      name,
      slug,
      description: "Dental product recommendations",
      primary_color: "#14b8a6",
      secondary_color: "#f59e0b",
      owner_id: user.id,
    })
    .select()
    .single();

  if (shopErr) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card p-6 max-w-sm text-center">
          <p className="text-red-600 text-sm mb-2">Failed to set up your shop:</p>
          <p className="text-sm text-slate-500">{shopErr.message}</p>
        </div>
      </div>
    );
  }

  await supabase.from("shop_members").insert({
    shop_id: shop.id,
    user_id: user.id,
    role: "owner",
    accepted: true,
  });

  redirect(`/app/${slug}/dashboard`);
}
