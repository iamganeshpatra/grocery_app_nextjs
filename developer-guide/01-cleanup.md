# Developer Guide — 01: Cleanup

The existing codebase has old, messy code that does not match the structure or patterns in this guide.  
This document tells you exactly what to delete and how to reset the database before starting fresh.

**Do this before writing any new code.**

---

## Step 1 — Delete Root-Level Stray Files

These `.tsx` files are sitting at the project root — they should never be there.  
Delete all of them:

```bash
rm addAndRemoveCart.tsx
rm customerNavbar.tsx
rm editProductForm.tsx
rm managerDashboard.tsx
rm managerNavbar.tsx
rm productActions.tsx
rm searchBox.tsx
rm shopProducts.tsx
```

---

## Step 2 — Delete Old App Pages

Delete all existing page files. You will rebuild them correctly from scratch.

```bash
# Delete everything under app/ EXCEPT api/ and generated/
rm -rf app/seller-signup
rm -rf app/signup
rm -rf app/signin
rm -rf app/auth-redirect
rm -rf app/forgot-password
rm -rf app/unauthorized
rm -rf app/customer
rm -rf app/shop-owner
rm app/page.tsx
```

Do NOT delete:
- `app/api/` — the better-auth handler lives here
- `app/generated/` — auto-generated Prisma types
- `app/globals.css` — Tailwind styles
- `app/layout.tsx` — root layout

---

## Step 3 — Delete Old Components (Feature Components Only)

Delete old custom feature components. Keep the `components/ui/` folder — those are shadcn primitives.

```bash
rm components/homePage.tsx
rm components/createShop.tsx
rm components/deleteShop.tsx
rm components/create-products.tsx
rm components/addProductsFromList.tsx
rm components/product-add-to-cart.tsx
rm components/shop-navbar.tsx
rm components/shop-owner-navbar.tsx
rm components/navbarSwitching-ShopOwnerAndShop.tsx
```

After this, `components/` should only contain `ui/`.

---

## Step 4 — Delete Old Actions

```bash
rm -rf actions/
```

You will create a clean `actions/` folder from scratch.

---

## Step 5 — Delete Old Data Folder

```bash
rm -rf data/
```

---

## Step 6 — Delete Old Migrations

The existing migrations are messy and inconsistent. You will create a single clean migration.

```bash
rm -rf prisma/migrations/
```

Also delete the seed file — you will create a proper one later:

```bash
rm prisma/seed.ts
```

---

## Step 7 — Reset the Database

You need to drop all existing tables in Supabase and start fresh.

### Option A — Using psql (Recommended)

Run this in your terminal. It drops everything and rebuilds the empty schema:

```bash
psql "postgresql://postgres.fbdwyqjxrzllhlfnsgrr:ZHb948dVGOV2HoAc@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres" \
  -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO postgres; GRANT ALL ON SCHEMA public TO public;"
```

### Option B — Via Supabase Dashboard

1. Go to [supabase.com](https://supabase.com) → your project
2. Navigate to **SQL Editor**
3. Run:
   ```sql
   DROP SCHEMA public CASCADE;
   CREATE SCHEMA public;
   GRANT ALL ON SCHEMA public TO postgres;
   GRANT ALL ON SCHEMA public TO public;
   ```
4. Click **Run**

---

## Step 8 — Update the Schema

Open `prisma/schema.prisma` and replace its entire contents with the schema from `02-schema.md`.

---

## Step 9 — Run the Fresh Migration

```bash
npx prisma migrate dev --name init
```

This will:
1. Read `prisma/schema.prisma`
2. Generate a single migration SQL file at `prisma/migrations/`
3. Apply it to your Supabase database
4. Regenerate the Prisma client at `app/generated/prisma/`

If the migration succeeds, you will see:

```
✔  Generated Prisma Client
✔  Database is now in sync with your schema.
```

---

## Step 10 — Verify Your Environment File

Make sure `.env` has all required variables:

```env
DATABASE_URL="postgresql://postgres.fbdwyqjxrzllhlfnsgrr:ZHb948dVGOV2HoAc@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres"
BETTER_AUTH_SECRET="your-secret-here"
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

- `BETTER_AUTH_SECRET` — any long random string (32+ characters). Generate one:
  ```bash
  openssl rand -base64 32
  ```
- `NEXT_PUBLIC_APP_URL` — must be set for the auth client to know where the API lives.  
  Add this line if it's not already in `.env`.

---

## Step 11 — Verify the Dev Server Starts

```bash
npm run dev
```

You should see:

```
▲ Next.js 16
- Local: http://localhost:3000
```

No errors. If you see TypeScript errors, check that:
- `app/generated/prisma/` was regenerated (it appears after `prisma migrate dev`)
- You deleted all the old files in Steps 1–5

---

## Checkpoint — What You Should Have After Cleanup

```
grocery_app_nextjs/
├── app/
│   ├── api/auth/[...all]/route.ts   ✅ keep
│   ├── generated/prisma/            ✅ keep (regenerated)
│   ├── globals.css                  ✅ keep
│   └── layout.tsx                   ✅ keep
├── components/
│   └── ui/                          ✅ keep (badge, button, card, input, textarea, sonner)
├── lib/
│   ├── auth.ts                      ✅ keep (will update in 03-auth.md)
│   ├── auth-client.ts               ✅ keep (will update in 03-auth.md)
│   ├── db.ts                        ✅ keep
│   └── utils.ts                     ✅ keep
├── prisma/
│   ├── schema.prisma                ✅ updated in Step 8
│   └── migrations/init/             ✅ generated in Step 9
├── proxy.ts                         ← does not exist yet (created in 03-auth.md)
├── .env                             ✅ keep + add NEXT_PUBLIC_APP_URL
├── next.config.ts                   ✅ keep
├── package.json                     ✅ keep
└── tsconfig.json                    ✅ keep
```

Now proceed to `02-schema.md`.
