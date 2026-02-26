"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";
import { nanoid } from "nanoid";
import { redirect } from "next/navigation";

export async function createShop(formData: FormData) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || "";
  const primary_color = (formData.get("primary_color") as string)?.trim() || "#14b8a6";
  const secondary_color = (formData.get("secondary_color") as string)?.trim() || "#f59e0b";

  if (!name) throw new Error("Shop name is required");

  let slug = slugify(name);

  // Check slug uniqueness
  const { data: existing } = await supabase
    .from("shops")
    .select("id")
    .eq("slug", slug)
    .single();

  if (existing) slug = `${slug}-${nanoid(4)}`;

  // Create the shop
  const { data: shop, error: shopErr } = await supabase
    .from("shops")
    .insert({
      name,
      slug,
      description,
      primary_color,
      secondary_color,
      owner_id: user.id,
    })
    .select()
    .single();

  if (shopErr) throw new Error(shopErr.message);

  // Add the creator as owner member
  const { error: memberErr } = await supabase
    .from("shop_members")
    .insert({
      shop_id: shop.id,
      user_id: user.id,
      role: "owner",
      accepted: true,
    });

  if (memberErr) throw new Error(memberErr.message);

  redirect(`/app/${slug}/dashboard`);
}

export async function acceptInvite(inviteId: string) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("shop_members")
    .update({ user_id: user.id, accepted: true })
    .eq("id", inviteId)
    .eq("invited_email", user.email);

  if (error) throw new Error(error.message);
}
