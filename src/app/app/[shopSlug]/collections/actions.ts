"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/utils";
import { generateQr } from "@/lib/qr";
import { nanoid } from "nanoid";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { notifyNewProduct } from "@/lib/email";

export async function createCollection(shopSlug: string, shopId: string, formData: FormData) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || "";
  const visibility = (formData.get("visibility") as string) || "shop";

  if (!title) throw new Error("Title is required");

  let slug = slugify(title);

  const { data: existing } = await supabase
    .from("collections")
    .select("id")
    .eq("shop_id", shopId)
    .eq("slug", slug)
    .single();

  if (existing) slug = `${slug}-${nanoid(4)}`;

  const { data, error } = await supabase
    .from("collections")
    .insert({
      shop_id: shopId,
      owner_id: user.id,
      title,
      slug,
      description,
      visibility,
      active: true,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Auto-generate exactly 1 QR code for this collection
  try {
    const admin = createAdminClient();
    const code = nanoid(8);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const redirectUrl = `${appUrl}/r/${code}`;
    const redirectPath = `/s/${shopSlug}/${slug}`;

    const { svg, pngBuffer } = await generateQr(redirectUrl);
    const svgPath = `qr/${code}.svg`;
    const pngPath = `qr/${code}.png`;

    await admin.storage
      .from("qr-codes")
      .upload(svgPath, Buffer.from(svg), { contentType: "image/svg+xml", upsert: true });
    await admin.storage
      .from("qr-codes")
      .upload(pngPath, pngBuffer, { contentType: "image/png", upsert: true });

    await supabase.from("qr_codes").insert({
      code,
      label: title,
      collection_id: data.id,
      shop_id: shopId,
      redirect_path: redirectPath,
      qr_svg_path: svgPath,
      qr_png_path: pngPath,
    });
  } catch {
    // QR generation is non-critical
  }

  revalidatePath(`/app/${shopSlug}/collections`);
  revalidatePath(`/app/${shopSlug}/qr-codes`);
  redirect(`/app/${shopSlug}/collections/${data.id}`);
}

export async function updateCollection(shopSlug: string, id: string, formData: FormData) {
  const supabase = await createServerSupabase();

  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || "";
  const visibility = (formData.get("visibility") as string) || "shop";
  const active = formData.get("active") === "true";

  if (!title) throw new Error("Title is required");

  const { error } = await supabase
    .from("collections")
    .update({ title, description, visibility, active })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath(`/app/${shopSlug}/collections`);
  revalidatePath(`/app/${shopSlug}/collections/${id}`);
}

export async function deleteCollection(shopSlug: string, id: string) {
  const supabase = await createServerSupabase();

  const { error } = await supabase.from("collections").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath(`/app/${shopSlug}/collections`);
  redirect(`/app/${shopSlug}/collections`);
}

// --- Item actions ---

export async function createItem(shopSlug: string, collectionId: string, shopId: string, formData: FormData) {
  const supabase = await createServerSupabase();

  const title = (formData.get("title") as string)?.trim();
  const note = (formData.get("note") as string)?.trim() || "";
  const product_url = (formData.get("product_url") as string)?.trim();
  const image_url = (formData.get("image_url") as string)?.trim() || "";

  if (!title) throw new Error("Title is required");
  if (!product_url) throw new Error("Product URL is required");

  const { data: items } = await supabase
    .from("items")
    .select("sort_order")
    .eq("collection_id", collectionId)
    .order("sort_order", { ascending: false })
    .limit(1);

  const sort_order = items && items.length > 0 ? items[0].sort_order + 1 : 0;

  const { error } = await supabase.from("items").insert({
    collection_id: collectionId,
    shop_id: shopId,
    title,
    note,
    product_url,
    image_url,
    sort_order,
    active: true,
  });

  if (error) throw new Error(error.message);

  // Notify subscribers (non-blocking)
  notifySubscribers(collectionId, shopSlug, title, image_url, note).catch(() => {});

  revalidatePath(`/app/${shopSlug}/collections/${collectionId}`);
}

async function notifySubscribers(
  collectionId: string,
  shopSlug: string,
  productTitle: string,
  productImage: string,
  productNote: string,
) {
  try {
    const admin = createAdminClient();

    const { data: collection } = await admin
      .from("collections")
      .select("title, slug, shop_id, shops(slug)")
      .eq("id", collectionId)
      .single();

    if (!collection) return;

    const { data: subs } = await admin
      .from("collection_subscribers")
      .select("email")
      .eq("collection_id", collectionId)
      .eq("unsubscribed", false);

    if (!subs || subs.length === 0) return;

    const shopData = collection.shops as unknown as { slug: string };
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const collectionUrl = `${appUrl}/s/${shopData.slug}/${collection.slug}`;

    await notifyNewProduct({
      emails: subs.map((s: { email: string }) => s.email),
      collectionTitle: collection.title,
      productTitle,
      productImage: productImage || undefined,
      productNote: productNote || undefined,
      collectionUrl,
    });
  } catch (err) {
    console.error("Subscriber notification failed:", err);
  }
}

export async function updateItem(shopSlug: string, itemId: string, collectionId: string, formData: FormData) {
  const supabase = await createServerSupabase();

  const title = (formData.get("title") as string)?.trim();
  const note = (formData.get("note") as string)?.trim() || "";
  const product_url = (formData.get("product_url") as string)?.trim();
  const image_url = (formData.get("image_url") as string)?.trim() || "";
  const active = formData.get("active") === "true";
  const sort_order = parseInt(formData.get("sort_order") as string) || 0;

  if (!title) throw new Error("Title is required");
  if (!product_url) throw new Error("Product URL is required");

  const { error } = await supabase
    .from("items")
    .update({ title, note, product_url, image_url, active, sort_order })
    .eq("id", itemId);

  if (error) throw new Error(error.message);

  revalidatePath(`/app/${shopSlug}/collections/${collectionId}`);
}

export async function deleteItem(shopSlug: string, itemId: string, collectionId: string) {
  const supabase = await createServerSupabase();

  const { error } = await supabase.from("items").delete().eq("id", itemId);
  if (error) throw new Error(error.message);

  revalidatePath(`/app/${shopSlug}/collections/${collectionId}`);
}

// --- Share actions ---

export async function shareCollection(
  shopSlug: string,
  collectionId: string,
  userId: string,
  permission: "read" | "readwrite"
) {
  const supabase = await createServerSupabase();

  const { error } = await supabase.from("collection_shares").upsert(
    { collection_id: collectionId, user_id: userId, permission },
    { onConflict: "collection_id,user_id" }
  );

  if (error) throw new Error(error.message);

  revalidatePath(`/app/${shopSlug}/collections/${collectionId}`);
}

export async function removeShare(shopSlug: string, shareId: string, collectionId: string) {
  const supabase = await createServerSupabase();

  const { error } = await supabase.from("collection_shares").delete().eq("id", shareId);
  if (error) throw new Error(error.message);

  revalidatePath(`/app/${shopSlug}/collections/${collectionId}`);
}
