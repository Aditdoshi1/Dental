-- Collection subscribers: users who want email updates when new products are added
CREATE TABLE IF NOT EXISTS collection_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  subscribed_at TIMESTAMPTZ DEFAULT now(),
  unsubscribed BOOLEAN DEFAULT false,
  UNIQUE(collection_id, email)
);

-- Allow public inserts (subscribe) and service-role reads
ALTER TABLE collection_subscribers ENABLE ROW LEVEL SECURITY;

-- Anyone can subscribe (public insert)
CREATE POLICY "Anyone can subscribe"
  ON collection_subscribers FOR INSERT
  WITH CHECK (true);

-- Only service role or shop members can read subscribers
CREATE POLICY "Shop members can view subscribers"
  ON collection_subscribers FOR SELECT
  USING (
    collection_id IN (
      SELECT c.id FROM collections c
      WHERE c.shop_id IN (SELECT get_my_shop_ids())
    )
  );

-- Allow unsubscribe by matching email
CREATE POLICY "Subscribers can unsubscribe themselves"
  ON collection_subscribers FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_collection_subscribers_collection
  ON collection_subscribers(collection_id) WHERE NOT unsubscribed;

-- Clean up duplicate QR codes: keep only the newest QR per collection
DELETE FROM qr_codes
WHERE id NOT IN (
  SELECT DISTINCT ON (collection_id) id
  FROM qr_codes
  ORDER BY collection_id, created_at DESC
);
