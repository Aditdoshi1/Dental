-- ============================================================
-- Seed Data for QRShelf Multi-Tenant MVP
-- Run after initial schema migration AND after creating
-- at least one admin user via Supabase Auth.
--
-- Replace 'YOUR_USER_ID' below with your actual auth.users UUID
-- (find it in Supabase Dashboard → Authentication → Users).
-- ============================================================

-- NOTE: You must replace this UUID with your actual user ID
-- DO 'SELECT id FROM auth.users LIMIT 1;' to find it.

-- Step 1: Make sure profile exists (should be auto-created by trigger)
-- If not, insert manually:
-- INSERT INTO profiles (id, display_name, email)
-- VALUES ('YOUR_USER_ID', 'Admin', 'admin@example.com');

-- Step 2: Create a sample shop
-- Replace YOUR_USER_ID with your actual user UUID
/*
INSERT INTO shops (id, name, slug, description, primary_color, secondary_color, owner_id) VALUES
  ('aaaa1111-1111-1111-1111-111111111111',
   'Bright Smile Dental',
   'bright-smile-dental',
   'Your neighborhood dental clinic with product recommendations.',
   '#14b8a6',
   '#f59e0b',
   'YOUR_USER_ID');

INSERT INTO shop_members (shop_id, user_id, role, accepted) VALUES
  ('aaaa1111-1111-1111-1111-111111111111', 'YOUR_USER_ID', 'owner', true);

-- Step 3: Create collections
INSERT INTO collections (id, shop_id, owner_id, title, slug, description, visibility, active) VALUES
  ('cccc1111-1111-1111-1111-111111111111',
   'aaaa1111-1111-1111-1111-111111111111',
   'YOUR_USER_ID',
   'Post-Cleaning Essentials',
   'post-cleaning-essentials',
   'Products we recommend after your professional cleaning.',
   'shop',
   true),

  ('cccc2222-2222-2222-2222-222222222222',
   'aaaa1111-1111-1111-1111-111111111111',
   'YOUR_USER_ID',
   'Sensitive Teeth Solutions',
   'sensitive-teeth',
   'Top picks for managing tooth sensitivity at home.',
   'shop',
   true);

-- Step 4: Create items
INSERT INTO items (collection_id, shop_id, title, note, product_url, sort_order, active) VALUES
  ('cccc1111-1111-1111-1111-111111111111',
   'aaaa1111-1111-1111-1111-111111111111',
   'Oral-B Genius X Electric Toothbrush',
   'AI-powered brushing timer helps you cover every zone.',
   'https://www.amazon.com/dp/B07QJG8YBM?tag=your-tag-20',
   0, true),

  ('cccc1111-1111-1111-1111-111111111111',
   'aaaa1111-1111-1111-1111-111111111111',
   'Cocofloss Dental Floss – Coconut',
   'Thick textured fibers grab plaque better than regular floss.',
   'https://www.amazon.com/dp/B07BQKRWY7?tag=your-tag-20',
   1, true),

  ('cccc1111-1111-1111-1111-111111111111',
   'aaaa1111-1111-1111-1111-111111111111',
   'TheraBreath Fresh Breath Oral Rinse',
   'Alcohol-free mouthwash — great for daily use.',
   'https://www.amazon.com/dp/B001ET76AI?tag=your-tag-20',
   2, true),

  ('cccc2222-2222-2222-2222-222222222222',
   'aaaa1111-1111-1111-1111-111111111111',
   'Sensodyne Pronamel Intensive Enamel Repair',
   'Our top pick for enamel erosion and sensitivity.',
   'https://www.amazon.com/dp/B08D3Y1WKG?tag=your-tag-20',
   0, true),

  ('cccc2222-2222-2222-2222-222222222222',
   'aaaa1111-1111-1111-1111-111111111111',
   'MI Paste Plus with Recaldent',
   'Apply after brushing to help remineralize teeth.',
   'https://www.amazon.com/dp/B002LZXPPS?tag=your-tag-20',
   1, true);

-- Step 5: Create QR codes
INSERT INTO qr_codes (code, label, collection_id, shop_id, redirect_path, qr_svg_path, qr_png_path) VALUES
  ('PCE001',
   'Post-Cleaning Essentials',
   'cccc1111-1111-1111-1111-111111111111',
   'aaaa1111-1111-1111-1111-111111111111',
   '/s/bright-smile-dental/post-cleaning-essentials',
   'qr/PCE001.svg',
   'qr/PCE001.png'),

  ('SST001',
   'Sensitive Teeth Solutions',
   'cccc2222-2222-2222-2222-222222222222',
   'aaaa1111-1111-1111-1111-111111111111',
   '/s/bright-smile-dental/sensitive-teeth',
   'qr/SST001.svg',
   'qr/SST001.png');
*/

-- INSTRUCTIONS:
-- 1. Find your user UUID: SELECT id FROM auth.users LIMIT 1;
-- 2. Replace every 'YOUR_USER_ID' above with that UUID
-- 3. Uncomment the block above (remove /* and */)
-- 4. Run in SQL Editor
