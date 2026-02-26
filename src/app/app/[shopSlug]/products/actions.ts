"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateQr } from "@/lib/qr";
import { nanoid } from "nanoid";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { notifyNewProduct } from "@/lib/email";

export async function createProduct(shopSlug: string, shopId: string, formData: FormData) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const title = (formData.get("title") as string)?.trim();
  const note = (formData.get("note") as string)?.trim() || "";
  const product_url = (formData.get("product_url") as string)?.trim();
  const image_url = (formData.get("image_url") as string)?.trim() || "";

  if (!title) throw new Error("Title is required");
  if (!product_url) throw new Error("Product URL is required");

  const { data, error } = await supabase
    .from("items")
    .insert({
      shop_id: shopId,
      collection_id: null,
      title,
      note,
      product_url,
      image_url,
      sort_order: 0,
      active: true,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Auto-generate QR code for this product (points to public link with ?src= for tracking)
  try {
    const admin = createAdminClient();
    const code = nanoid(8);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const publicPath = `/p/${shopSlug}/${data.id}`;
    const redirectPath = publicPath;
    // QR and public link are the same: encode direct public URL with ?src= for scan attribution
    const qrUrl = `${appUrl}${publicPath}?src=${code}`;

    const { svg, pngBuffer } = await generateQr(qrUrl);
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
      collection_id: null,
      item_id: data.id,
      shop_id: shopId,
      redirect_path: redirectPath,
      qr_svg_path: svgPath,
      qr_png_path: pngPath,
    });
  } catch {
    // QR generation is non-critical
  }

  revalidatePath(`/app/${shopSlug}/products`);
  revalidatePath(`/app/${shopSlug}/qr-codes`);
  redirect(`/app/${shopSlug}/products`);
}

export async function updateProduct(shopSlug: string, itemId: string, formData: FormData) {
  const supabase = await createServerSupabase();

  const title = (formData.get("title") as string)?.trim();
  const note = (formData.get("note") as string)?.trim() || "";
  const product_url = (formData.get("product_url") as string)?.trim();
  const image_url = (formData.get("image_url") as string)?.trim() || "";
  const active = formData.get("active") === "true";

  if (!title) throw new Error("Title is required");
  if (!product_url) throw new Error("Product URL is required");

  const { error } = await supabase
    .from("items")
    .update({ title, note, product_url, image_url, active })
    .eq("id", itemId);

  if (error) throw new Error(error.message);

  revalidatePath(`/app/${shopSlug}/products`);
}

export async function deleteProduct(shopSlug: string, itemId: string) {
  const supabase = await createServerSupabase();

  await supabase.from("qr_codes").delete().eq("item_id", itemId);
  const { error } = await supabase.from("items").delete().eq("id", itemId);
  if (error) throw new Error(error.message);

  revalidatePath(`/app/${shopSlug}/products`);
  revalidatePath(`/app/${shopSlug}/qr-codes`);
}

/** Add a standalone product into a collection (creates a new item in the collection with same data). */
export async function addProductToCollection(
  shopSlug: string,
  shopId: string,
  productItemId: string,
  collectionId: string
) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: product } = await supabase
    .from("items")
    .select("title, note, product_url, image_url")
    .eq("id", productItemId)
    .eq("shop_id", shopId)
    .is("collection_id", null)
    .single();

  if (!product) throw new Error("Product not found");

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
    title: product.title,
    note: product.note || "",
    product_url: product.product_url,
    image_url: product.image_url || "",
    sort_order,
    active: true,
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/app/${shopSlug}/products`);
  revalidatePath(`/app/${shopSlug}/collections`);
  revalidatePath(`/app/${shopSlug}/collections/${collectionId}`);
}

export async function updateShopName(shopSlug: string, shopId: string, formData: FormData) {
  const supabase = await createServerSupabase();

  const name = (formData.get("name") as string)?.trim();
  if (!name) throw new Error("Shop name is required");

  const { error } = await supabase
    .from("shops")
    .update({ name })
    .eq("id", shopId);

  if (error) throw new Error(error.message);

  revalidatePath(`/app/${shopSlug}`);
}
