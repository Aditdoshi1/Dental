import type { SupabaseClient } from "@supabase/supabase-js";
import type { ShopRole, Collection } from "@/types/database";

export interface UserShopContext {
  userId: string;
  shopId: string;
  role: ShopRole;
}

/**
 * Get the current user's role in a shop.
 * Returns null if not a member.
 */
export async function getUserShopRole(
  supabase: SupabaseClient,
  userId: string,
  shopId: string
): Promise<ShopRole | null> {
  const { data } = await supabase
    .from("shop_members")
    .select("role")
    .eq("shop_id", shopId)
    .eq("user_id", userId)
    .eq("accepted", true)
    .single();

  return data?.role ?? null;
}

/**
 * Get all shops a user belongs to.
 */
export async function getUserShops(
  supabase: SupabaseClient,
  userId: string
) {
  const { data } = await supabase
    .from("shop_members")
    .select("shop_id, role, shops(id, name, slug, logo_url)")
    .eq("user_id", userId)
    .eq("accepted", true);

  return data ?? [];
}

/**
 * Check if user can view a collection.
 */
export function canViewCollection(
  collection: Collection,
  userId: string,
  role: ShopRole,
  shares: { user_id: string }[]
): boolean {
  if (collection.visibility === "shop") return true;
  if (collection.owner_id === userId) return true;
  if (role === "owner") return true;
  return shares.some((s) => s.user_id === userId);
}

/**
 * Check if user can edit a collection.
 */
export function canEditCollection(
  collection: Collection,
  userId: string,
  role: ShopRole,
  shares: { user_id: string; permission: string }[]
): boolean {
  if (collection.owner_id === userId) return true;
  if (role === "owner" || role === "admin") {
    if (collection.visibility === "shop") return true;
  }
  const share = shares.find((s) => s.user_id === userId);
  return share?.permission === "readwrite";
}

/**
 * Check if user can manage shop settings (owner or admin).
 */
export function canManageShop(role: ShopRole): boolean {
  return role === "owner" || role === "admin";
}

/**
 * Check if user can manage team members (owner or admin).
 */
export function canManageTeam(role: ShopRole): boolean {
  return role === "owner" || role === "admin";
}

/**
 * Resolve a shop by slug and verify user membership.
 * Returns shop + user context or null.
 */
export async function resolveShopContext(
  supabase: SupabaseClient,
  shopSlug: string,
  userId: string
): Promise<{
  shop: { id: string; name: string; slug: string; logo_url: string; primary_color: string; secondary_color: string; owner_id: string };
  role: ShopRole;
} | null> {
  const { data: shop } = await supabase
    .from("shops")
    .select("id, name, slug, logo_url, primary_color, secondary_color, owner_id")
    .eq("slug", shopSlug)
    .single();

  if (!shop) return null;

  const role = await getUserShopRole(supabase, userId, shop.id);
  if (!role) return null;

  return { shop, role };
}
