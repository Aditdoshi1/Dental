-- Allow items to exist without a collection (standalone products)
ALTER TABLE items ALTER COLUMN collection_id DROP NOT NULL;

-- Add item_id to qr_codes for standalone product QR codes
ALTER TABLE qr_codes ALTER COLUMN collection_id DROP NOT NULL;
ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS item_id UUID REFERENCES items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_qr_codes_item ON qr_codes(item_id);
CREATE INDEX IF NOT EXISTS idx_items_standalone ON items(shop_id) WHERE collection_id IS NULL;

-- Allow click_events.collection_id to be nullable for standalone product clicks
ALTER TABLE click_events ALTER COLUMN collection_id DROP NOT NULL;

-- RLS: standalone items (collection_id IS NULL) should be readable by shop members
-- The existing policies on items already check shop_id, so standalone products
-- belonging to a shop are accessible to shop members. No new policies needed.
