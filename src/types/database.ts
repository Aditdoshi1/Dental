export interface Profile {
  id: string;
  display_name: string;
  email: string;
  avatar_url: string;
  created_at: string;
  updated_at: string;
}

export interface Shop {
  id: string;
  name: string;
  slug: string;
  description: string;
  logo_url: string;
  primary_color: string;
  secondary_color: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface ShopMember {
  id: string;
  shop_id: string;
  user_id: string | null;
  role: "owner" | "admin" | "member";
  invited_email: string;
  accepted: boolean;
  created_at: string;
}

export interface Collection {
  id: string;
  shop_id: string;
  owner_id: string;
  title: string;
  slug: string;
  description: string;
  visibility: "shop" | "personal";
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CollectionShare {
  id: string;
  collection_id: string;
  user_id: string;
  permission: "read" | "readwrite";
  created_at: string;
}

export interface Item {
  id: string;
  collection_id: string | null;
  shop_id: string;
  title: string;
  note: string;
  product_url: string;
  image_url: string;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface QrCode {
  id: string;
  code: string;
  label: string;
  collection_id: string | null;
  item_id: string | null;
  shop_id: string;
  redirect_path: string;
  qr_svg_path: string;
  qr_png_path: string;
  created_at: string;
  updated_at: string;
}

export interface ScanEvent {
  id: string;
  qr_code_id: string;
  scanned_at: string;
  user_agent: string;
  device_type: string;
  referrer: string;
  country_region: string;
  ip_hash: string;
}

export interface ClickEvent {
  id: string;
  qr_code_id: string | null;
  collection_id: string | null;
  item_id: string;
  clicked_at: string;
  user_agent: string;
}

export type ShopRole = "owner" | "admin" | "member";
export type SharePermission = "read" | "readwrite";
export type CollectionVisibility = "shop" | "personal";
