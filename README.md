# GarageBook v1.0 - Digital Register for Garages

GarageBook is a complete, production-ready, installable Progressive Web App (PWA) designed to replace paper registers in small motorcycle garages. Focused on speed, simplicity, and ease of use, a garage owner can create an invoice in under 30 seconds.

---

## Technical Stack
- **Framework**: Next.js 15+ (React 19, TypeScript, Tailwind CSS v4)
- **Database / Auth**: Supabase (PostgreSQL) with full Row-Level Security (RLS) policies
- **Forms & Validation**: React Hook Form, Zod schema validation
- **Caching & Toasts**: TanStack React Query, Sonner Toaster
- **PDF Generation**: jsPDF client-side generator
- **Installable PWA**: Offline assets caching, manifest rules, service worker

---

## Features
1. **Multi-Tenant Schema**: Every table features a `garage_id` column referencing a central `garage` workspace. RLS rules ensure full isolation: owners only see their own customer registers.
2. **Double Login Mode**:
   - **Local fallback (no setup)**: If environment variables are empty, the app falls back to local file storage (`data/db.json`) and seeds 10 customers, 20 vehicles, and 50 bills automatically. Log in with PIN `1234`.
   - **Production (Supabase)**: Enforces email/password credentials and refreshes cookies securely.
3. **PWA Standalone Mode**: Can be installed directly from Chrome, Edge, Safari, or Android. Opens as a standalone app window without browser URL bars.
4. **WhatsApp Invoice Sharing**: Opens an automated pre-formatted chat details link using the customer's saved phone number.
5. **Print & PDF Downloads**: Print directly on desktop thermal rolls or download sharp, high-quality A5 receipts.

---

## Setup Instructions

### 1. Supabase DDL Setup
1. Open your **Supabase Dashboard**.
2. Navigate to the **SQL Editor** tab.
3. Paste and run the DDL schema migration script found in:
   [supabase/migrations/migrations.sql](file:///c:/Users/Shivam/Documents/GarageBook/supabase/migrations/migrations.sql)

### 2. Configure Environment Keys
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-public-key
```

### 3. Run Locally
Install packages and start the Next.js development server:
```bash
npm install
npm run dev
```

### 4. Build for Production
Run checks and optimization bundling for Vercel/production:
```bash
npm run build
```
