-- ============================================================
-- QRShelf – Multi-Tenant SaaS Schema
-- Run this in Supabase SQL Editor or via CLI migrations
-- ============================================================

-- 0) Profiles (auto-created on auth.users insert)
CREATE TABLE IF NOT EXISTS profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '',
  email        TEXT NOT NULL DEFAULT '',
  avatar_url   TEXT DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1) Shops
CREATE TABLE IF NOT EXISTS shops (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  description     TEXT DEFAULT '',
  logo_url        TEXT DEFAULT '',
  primary_color   TEXT NOT NULL DEFAULT '#14b8a6',
  secondary_color TEXT NOT NULL DEFAULT '#f59e0b',
  owner_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shops_slug ON shops (slug);
CREATE INDEX idx_shops_owner ON shops (owner_id);

-- 2) Shop Members
CREATE TABLE IF NOT EXISTS shop_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id       UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role          TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  invited_email TEXT DEFAULT '',
  accepted      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shop_members_shop ON shop_members (shop_id);
CREATE INDEX idx_shop_members_user ON shop_members (user_id);
CREATE INDEX idx_shop_members_email ON shop_members (invited_email);
CREATE UNIQUE INDEX idx_shop_members_unique ON shop_members (shop_id, user_id) WHERE user_id IS NOT NULL;

-- 3) Collections
CREATE TABLE IF NOT EXISTS collections (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  owner_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  slug        TEXT NOT NULL,
  description TEXT DEFAULT '',
  visibility  TEXT NOT NULL DEFAULT 'shop' CHECK (visibility IN ('shop', 'personal')),
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (shop_id, slug)
);

CREATE INDEX idx_collections_shop ON collections (shop_id);
CREATE INDEX idx_collections_owner ON collections (owner_id);
CREATE INDEX idx_collections_slug ON collections (shop_id, slug);

-- 4) Collection Shares
CREATE TABLE IF NOT EXISTS collection_shares (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  permission    TEXT NOT NULL DEFAULT 'read' CHECK (permission IN ('read', 'readwrite')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (collection_id, user_id)
);

CREATE INDEX idx_collection_shares_collection ON collection_shares (collection_id);
CREATE INDEX idx_collection_shares_user ON collection_shares (user_id);

-- 5) Items (products within a collection)
CREATE TABLE IF NOT EXISTS items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  shop_id       UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  note          TEXT DEFAULT '',
  product_url   TEXT NOT NULL,
  image_url     TEXT DEFAULT '',
  sort_order    INT NOT NULL DEFAULT 0,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_items_collection ON items (collection_id);
CREATE INDEX idx_items_shop ON items (shop_id);
CREATE INDEX idx_items_sort ON items (collection_id, sort_order);

-- 6) QR Codes
CREATE TABLE IF NOT EXISTS qr_codes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          TEXT NOT NULL UNIQUE,
  label         TEXT DEFAULT '',
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  shop_id       UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  redirect_path TEXT NOT NULL,
  qr_svg_path   TEXT DEFAULT '',
  qr_png_path   TEXT DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_qr_codes_code ON qr_codes (code);
CREATE INDEX idx_qr_codes_collection ON qr_codes (collection_id);
CREATE INDEX idx_qr_codes_shop ON qr_codes (shop_id);

-- 7) Scan Events (no PII – IP is hashed)
CREATE TABLE IF NOT EXISTS scan_events (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code_id     UUID NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
  scanned_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_agent     TEXT DEFAULT '',
  device_type    TEXT DEFAULT '',
  referrer       TEXT DEFAULT '',
  country_region TEXT DEFAULT '',
  ip_hash        TEXT DEFAULT ''
);

CREATE INDEX idx_scan_events_qr ON scan_events (qr_code_id);
CREATE INDEX idx_scan_events_time ON scan_events (scanned_at);

-- 8) Click Events
CREATE TABLE IF NOT EXISTS click_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code_id    UUID,
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  item_id       UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  clicked_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_agent    TEXT DEFAULT ''
);

CREATE INDEX idx_click_events_collection ON click_events (collection_id);
CREATE INDEX idx_click_events_item ON click_events (item_id);
CREATE INDEX idx_click_events_time ON click_events (clicked_at);

-- ============================================================
-- Auto-update updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_shops_updated
  BEFORE UPDATE ON shops
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_collections_updated
  BEFORE UPDATE ON collections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_items_updated
  BEFORE UPDATE ON items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_qr_codes_updated
  BEFORE UPDATE ON qr_codes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Auto-create profile on auth.users insert
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- RLS Helper Functions (SECURITY DEFINER = bypass RLS)
-- These prevent infinite recursion when policies on
-- shop_members need to query shop_members itself.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_my_shop_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT shop_id FROM shop_members WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_my_admin_shop_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT shop_id FROM shop_members
  WHERE user_id = auth.uid() AND role IN ('owner', 'admin');
$$;

CREATE OR REPLACE FUNCTION public.get_my_owned_collection_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT id FROM collections WHERE owner_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_my_shared_collection_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT collection_id FROM collection_shares WHERE user_id = auth.uid();
$$;

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE click_events ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all profiles (for team display), update own
CREATE POLICY "Anyone can read profiles"
  ON profiles FOR SELECT USING (TRUE);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Shops: public read (needed for landing pages), owner can manage
CREATE POLICY "Public can read shops"
  ON shops FOR SELECT
  USING (TRUE);

CREATE POLICY "Owner can manage shop"
  ON shops FOR ALL
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Authenticated can create shops"
  ON shops FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- Shop Members: use helper functions to avoid self-referencing recursion
CREATE POLICY "Members can read their shop members"
  ON shop_members FOR SELECT
  TO authenticated
  USING (
    shop_id IN (SELECT public.get_my_shop_ids())
  );

CREATE POLICY "Owner/admin can manage members"
  ON shop_members FOR ALL
  TO authenticated
  USING (
    shop_id IN (SELECT public.get_my_admin_shop_ids())
  )
  WITH CHECK (
    shop_id IN (SELECT public.get_my_admin_shop_ids())
  );

CREATE POLICY "Users can insert own membership"
  ON shop_members FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Collections: complex visibility rules
CREATE POLICY "Shop members can read shop collections"
  ON collections FOR SELECT
  TO authenticated
  USING (
    shop_id IN (SELECT public.get_my_shop_ids())
    AND (
      visibility = 'shop'
      OR owner_id = auth.uid()
      OR id IN (SELECT public.get_my_shared_collection_ids())
    )
  );

CREATE POLICY "Public can read active collections"
  ON collections FOR SELECT
  USING (active = TRUE);

CREATE POLICY "Shop owner/admin can manage all shop collections"
  ON collections FOR ALL
  TO authenticated
  USING (
    shop_id IN (SELECT public.get_my_admin_shop_ids())
  )
  WITH CHECK (
    shop_id IN (SELECT public.get_my_admin_shop_ids())
  );

CREATE POLICY "Members can manage own collections"
  ON collections FOR ALL
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Collection Shares
CREATE POLICY "Collection owner can manage shares"
  ON collection_shares FOR ALL
  TO authenticated
  USING (
    collection_id IN (SELECT public.get_my_owned_collection_ids())
  )
  WITH CHECK (
    collection_id IN (SELECT public.get_my_owned_collection_ids())
  );

CREATE POLICY "Shared users can read their shares"
  ON collection_shares FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Items: follow collection access + public read active
CREATE POLICY "Public read active items"
  ON items FOR SELECT
  USING (active = TRUE);

CREATE POLICY "Shop members can read items"
  ON items FOR SELECT
  TO authenticated
  USING (
    shop_id IN (SELECT public.get_my_shop_ids())
  );

CREATE POLICY "Shop owner/admin can manage items"
  ON items FOR ALL
  TO authenticated
  USING (
    shop_id IN (SELECT public.get_my_admin_shop_ids())
  )
  WITH CHECK (
    shop_id IN (SELECT public.get_my_admin_shop_ids())
  );

CREATE POLICY "Collection owner can manage items"
  ON items FOR ALL
  TO authenticated
  USING (
    collection_id IN (SELECT public.get_my_owned_collection_ids())
  )
  WITH CHECK (
    collection_id IN (SELECT public.get_my_owned_collection_ids())
  );

-- QR Codes: public read (for redirect), shop members manage
CREATE POLICY "Public read qr_codes"
  ON qr_codes FOR SELECT
  USING (TRUE);

CREATE POLICY "Shop owner/admin can manage qr_codes"
  ON qr_codes FOR ALL
  TO authenticated
  USING (
    shop_id IN (SELECT public.get_my_admin_shop_ids())
  )
  WITH CHECK (
    shop_id IN (SELECT public.get_my_admin_shop_ids())
  );

-- Scan events: anyone can insert (for logging), shop members can read
CREATE POLICY "Anyone can insert scan_events"
  ON scan_events FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "Shop members can read scan_events"
  ON scan_events FOR SELECT
  TO authenticated
  USING (
    qr_code_id IN (
      SELECT id FROM qr_codes WHERE shop_id IN (SELECT public.get_my_shop_ids())
    )
  );

-- Click events: anyone can insert (for logging), shop members can read
CREATE POLICY "Anyone can insert click_events"
  ON click_events FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "Shop members can read click_events"
  ON click_events FOR SELECT
  TO authenticated
  USING (
    collection_id IN (
      SELECT id FROM collections WHERE shop_id IN (SELECT public.get_my_shop_ids())
    )
  );

-- ============================================================
-- Storage bucket for QR images and logos
-- ============================================================
-- Run in Supabase Dashboard > Storage or via API:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('qr-codes', 'qr-codes', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('shop-assets', 'shop-assets', true);
