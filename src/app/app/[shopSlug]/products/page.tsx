import { createServerSupabase } from "@/lib/supabase/server";
import { resolveShopContext } from "@/lib/permissions";
import { redirect } from "next/navigation";
import type { Item, QrCode, Collection } from "@/types/database";
import ProductManager from "@/components/admin/ProductManager";

interface Props {
  params: Promise<{ shopSlug: string }>;
}

export default async function ProductsPage({ params }: Props) {
  const { shopSlug } = await params;
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ctx = await resolveShopContext(supabase, shopSlug, user.id);
  if (!ctx) redirect("/setup");

  // Standalone products: items where collection_id IS NULL
  const { data: products } = await supabase
    .from("items")
    .select("*")
    .eq("shop_id", ctx.shop.id)
    .is("collection_id", null)
    .order("created_at", { ascending: false })
    .returns<Item[]>();

  // Get QR codes for standalone products
  const productIds = (products || []).map((p) => p.id);
  let qrMap: Record<string, QrCode> = {};

  if (productIds.length > 0) {
    const { data: qrCodes } = await supabase
      .from("qr_codes")
      .select("*")
      .in("item_id", productIds)
      .returns<QrCode[]>();

    if (qrCodes) {
      qrMap = Object.fromEntries(
        qrCodes.map((qr) => [qr.item_id!, qr])
      );
    }
  }

  const { data: collections } = await supabase
    .from("collections")
    .select("id, title, slug")
    .eq("shop_id", ctx.shop.id)
    .eq("active", true)
    .order("title")
    .returns<Pick<Collection, "id" | "title" | "slug">[]>();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Products</h1>
          <p className="text-sm text-slate-500 mt-1">Standalone products with individual QR codes</p>
        </div>
      </div>
      <ProductManager
        shopSlug={shopSlug}
        shopId={ctx.shop.id}
        products={products || []}
        qrMap={qrMap}
        appUrl={appUrl}
        collections={collections || []}
      />
    </div>
  );
}
