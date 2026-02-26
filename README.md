# DentalQR – Dental Product Recommendation Platform

A web app for dental hygienists to manage recommended products and generate printable QR codes that patients scan in a clinic. QR codes redirect through a tracking endpoint to a public landing page listing recommended products with Amazon affiliate links.

## Architecture Overview

```
Patient scans QR → /r/<code> (logs scan) → 302 redirect → /c/<slug>?src=<code>
                                                              ↓
                                                     Landing page shows products
                                                              ↓
                                              Patient clicks "View on Amazon"
                                                              ↓
                                               /api/track-click (logs click)
                                                              ↓
                                                    Opens Amazon affiliate link
```

**Key design decisions:**
- QR codes never link directly to affiliate URLs — they always go through our `/r/<code>` redirect endpoint
- All tracking is privacy-safe: no patient PII, IP addresses are hashed with daily-rotating salt
- Admin authentication via Supabase Auth (email/password)
- Row Level Security enforced on all tables

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend + Admin UI | Next.js 14 (App Router) + TypeScript |
| Styling | Tailwind CSS |
| Database + Auth + Storage | Supabase (Postgres, Auth, Storage) |
| QR Generation | `qrcode` library (server-side PNG + SVG) |
| Hosting | Vercel |
| Testing | Vitest |

## Project Structure

```
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout
│   │   ├── page.tsx                # Home / landing
│   │   ├── login/page.tsx          # Admin login
│   │   ├── (admin)/                # Admin route group (auth-protected)
│   │   │   ├── layout.tsx          # Admin layout with nav
│   │   │   ├── dashboard/          # Overview stats
│   │   │   ├── collections/        # CRUD collections & items
│   │   │   │   ├── actions.ts      # Server actions
│   │   │   │   ├── new/            # Create collection
│   │   │   │   └── [id]/           # Edit collection + manage items
│   │   │   ├── qr-codes/           # View/download QR codes
│   │   │   │   └── print/          # Printable QR sheet
│   │   │   └── analytics/          # Scans, clicks, funnel
│   │   ├── r/[code]/route.ts       # QR redirect + scan logging
│   │   ├── c/[slug]/page.tsx       # Public landing page
│   │   ├── privacy/page.tsx        # Privacy notice
│   │   └── api/
│   │       ├── track-click/        # Click event logging
│   │       └── export/             # CSV export (auth-required)
│   ├── components/
│   │   ├── admin/                  # Admin UI components
│   │   └── public/                 # Public-facing components
│   ├── lib/
│   │   ├── supabase/               # Supabase client factories
│   │   │   ├── client.ts           # Browser client
│   │   │   ├── server.ts           # Server component client
│   │   │   ├── admin.ts            # Service role client
│   │   │   └── middleware.ts       # Auth session refresh
│   │   ├── qr.ts                   # QR code generation (PNG+SVG)
│   │   ├── privacy.ts              # IP hashing with rotating salt
│   │   ├── rate-limit.ts           # In-memory rate limiter
│   │   └── utils.ts                # Slugify, CSV, date formatting
│   ├── middleware.ts               # Next.js middleware (auth guard)
│   └── types/database.ts           # TypeScript interfaces
├── supabase/
│   ├── migrations/001_initial_schema.sql
│   └── seed.sql
├── __tests__/
│   ├── qr-generation.test.ts
│   └── utils.test.ts
└── README.md
```

## Key Routes

| Route | Type | Description |
|-------|------|-------------|
| `/login` | Page | Admin login form |
| `/dashboard` | Page (protected) | Overview stats & quick actions |
| `/collections` | Page (protected) | List all collections |
| `/collections/new` | Page (protected) | Create a new collection |
| `/collections/[id]` | Page (protected) | Edit collection, manage items, generate QR |
| `/qr-codes` | Page (protected) | View all QR codes with download links |
| `/qr-codes/print` | Page (protected) | Printable QR sheet (Ctrl+P ready) |
| `/analytics` | Page (protected) | Scans, clicks, funnel visualization |
| `/r/[code]` | Route Handler | QR redirect: log scan → 302 to landing page |
| `/c/[slug]` | Page (public) | Patient landing page with product recommendations |
| `/privacy` | Page (public) | Privacy notice |
| `/api/track-click` | API Route | Log product click events |
| `/api/export?type=scans\|clicks` | API Route (protected) | CSV export |

## Setup Instructions

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your **Project URL** and **API Keys** (anon + service_role)

### 2. Run Database Migrations

In the Supabase SQL Editor, run:
1. `supabase/migrations/001_initial_schema.sql` — creates tables, indexes, RLS policies
2. `supabase/seed.sql` — (optional) inserts example data

### 3. Create Storage Bucket

In Supabase Dashboard → Storage:
1. Create a new bucket named `qr-codes`
2. Set it to **Public** (so QR images can be displayed)
3. Add a policy: allow authenticated users to insert/update, allow public select

Or via SQL:
```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('qr-codes', 'qr-codes', true);
```

### 4. Create Admin User

In Supabase Dashboard → Authentication → Users:
1. Click "Add User" → "Create new user"
2. Enter an email and password for your admin account

### 5. Configure Environment Variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
IP_HASH_SECRET=any-random-string-here
```

### 6. Install & Run

```bash
npm install
npm run dev
```

Visit `http://localhost:3000/login` and sign in with your admin credentials.

### 7. Deploy to Vercel

1. Push to GitHub
2. Import in [Vercel](https://vercel.com)
3. Add environment variables in Vercel project settings
4. Update `NEXT_PUBLIC_APP_URL` to your production domain
5. Deploy!

## Testing

```bash
npm test            # Run all tests
npm run test:watch  # Watch mode
```

Tests cover:
- QR code generation (SVG + PNG output, file format validation)
- URL slugification
- Device type detection
- Amazon URL validation
- IP address hashing
- Rate limiting
- CSV export formatting

## Data Model

### collections
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| title | TEXT | Display name |
| slug | TEXT | URL-safe identifier (unique) |
| description | TEXT | Shown to patients |
| active | BOOLEAN | Visibility toggle |
| created_at | TIMESTAMPTZ | Auto-set |
| updated_at | TIMESTAMPTZ | Auto-updated via trigger |

### items
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| collection_id | UUID | FK → collections |
| title | TEXT | Product name |
| note | TEXT | Hygienist's recommendation note |
| product_url | TEXT | Full Amazon affiliate URL |
| image_url | TEXT | Optional product image |
| sort_order | INT | Display order |
| active | BOOLEAN | Visibility toggle |

### qr_codes
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| code | TEXT | Short unique code (e.g. "PCE001") |
| label | TEXT | Display label |
| collection_id | UUID | FK → collections |
| redirect_path | TEXT | Target path (e.g. /c/slug) |
| qr_svg_path | TEXT | Storage path for SVG |
| qr_png_path | TEXT | Storage path for PNG |

### scan_events
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| qr_code_id | UUID | FK → qr_codes |
| scanned_at | TIMESTAMPTZ | When scan occurred |
| user_agent | TEXT | Browser UA (truncated) |
| device_type | TEXT | mobile/tablet/desktop |
| ip_hash | TEXT | SHA-256 hash (daily-rotating salt, truncated) |

### click_events
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| qr_code_id | UUID | Optional FK → qr_codes |
| collection_id | UUID | FK → collections |
| item_id | UUID | FK → items |
| clicked_at | TIMESTAMPTZ | When click occurred |
| user_agent | TEXT | Browser UA |

## Privacy & Security

- **No patient PII** is stored — no names, emails, phone numbers, or appointment IDs
- IP addresses are hashed using SHA-256 with a daily-rotating salt, then truncated to 16 hex chars
- The hash is one-way and cannot be reversed to the original IP
- Affiliate disclosure is displayed on every landing page
- Privacy notice is linked from every landing page
- Admin routes are protected by Supabase Auth + Next.js middleware
- Rate limiting on the `/r/[code]` redirect endpoint (30 req/min per IP)
- Row Level Security on all database tables

## GA4 Integration (Optional)

Set `NEXT_PUBLIC_GA4_MEASUREMENT_ID` in your environment to enable Google Analytics. You can add the GA4 script tag in `src/app/layout.tsx`. The DB-based analytics is always active regardless.

## License

Private — for clinic use only.
