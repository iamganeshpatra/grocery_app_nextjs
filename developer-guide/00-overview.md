# Developer Guide — Overview

This guide series walks you through building the Grocery Marketplace platform from scratch.  
Read every document in order. Do not skip sections.

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js | 16.x (App Router) |
| Language | TypeScript | 5.x |
| Authentication | better-auth | 1.6.9 |
| ORM | Prisma | 7.x |
| Database | PostgreSQL (Supabase) | — |
| DB Driver | @prisma/adapter-pg + pg | — |
| Styling | Tailwind CSS v4 | — |
| UI Components | shadcn/ui (Radix Nova) | — |
| Icons | Lucide React | — |
| Toasts | Sonner | — |
| Validation | Zod | 4.x |

---

## How the Pieces Connect

```
Browser
  │
  ├── proxy.ts (Next.js 16)          ← runs before every request, checks auth + role
  │
  ├── app/ (Next.js App Router)
  │     ├── Server Components         ← fetch data from DB directly, no API needed
  │     ├── Client Components         ← interactive UI (forms, modals, dropdowns)
  │     └── Server Actions            ← mutations (create, update, delete) called from client
  │
  ├── lib/auth.ts                     ← better-auth server config
  ├── lib/auth-client.ts              ← better-auth client (used in "use client" components)
  ├── lib/db.ts                       ← Prisma client singleton
  │
  ├── app/api/auth/[...all]/route.ts  ← better-auth handles all /api/auth/* requests
  │
  └── prisma/schema.prisma            ← single source of truth for the DB schema
```

---

## Project Folder Structure (Target State)

After cleanup and implementation, the project looks like this:

```
grocery_app_nextjs/
│
├── app/
│   ├── api/
│   │   └── auth/[...all]/route.ts     ← DO NOT TOUCH — better-auth handler
│   │
│   ├── (auth)/                         ← public auth pages (no layout wrapper)
│   │   ├── signin/page.tsx
│   │   ├── signup/page.tsx
│   │   ├── signup/seller/page.tsx
│   │   ├── signup/customer/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   └── reset-password/page.tsx
│   │
│   ├── auth-redirect/page.tsx          ← reads session role → redirects
│   ├── change-password/page.tsx        ← forced for managers on first login
│   ├── profile/page.tsx                ← all roles: update name + change password
│   ├── unauthorized/page.tsx
│   │
│   ├── admin/                          ← doc 05 (catalog, users, shops, returns)
│   ├── shop-owner/                     ← docs 04 + 08
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── new/page.tsx
│   │   └── [shopId]/
│   │       ├── layout.tsx
│   │       ├── page.tsx
│   │       ├── edit/page.tsx
│   │       ├── products/page.tsx
│   │       ├── managers/page.tsx
│   │       └── orders/                 ← doc 08
│   │
│   ├── manager/                        ← docs 06 + 08
│   └── customer/                       ← docs 07 + 09
│
├── components/
│   └── ui/                             ← shadcn primitives — NEVER edit these
│       ├── button.tsx
│       ├── card.tsx
│       ├── input.tsx
│       ├── badge.tsx
│       ├── textarea.tsx
│       └── sonner.tsx
│
├── actions/                            ← Server Actions (all DB mutations go here)
│   ├── auth.actions.ts
│   ├── shop.actions.ts
│   ├── shop-product.actions.ts
│   └── manager.actions.ts
│
├── lib/
│   ├── auth.ts                         ← better-auth server config
│   ├── auth-client.ts                  ← better-auth client config
│   ├── db.ts                           ← Prisma singleton
│   └── utils.ts                        ← cn() helper
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── proxy.ts                            ← Next.js 16 route protection (replaces middleware.ts)
├── .env
├── next.config.ts
├── package.json
└── tsconfig.json
```

---

## Key Conventions — Read These Before Writing Any Code

### 1. Server Components vs Client Components

**Default: Server Component** (no directive needed).  
Add `"use client"` at the top ONLY when you need:
- `useState`, `useEffect`, `useRef`, or any React hook
- Browser events (`onClick`, `onChange`, etc.)
- `authClient` methods (sign in, sign up, etc.)

```tsx
// Server Component — OK to fetch data directly
export default async function ShopPage() {
  const shops = await prisma.shop.findMany()  // direct DB call is fine
  return <div>{shops.map(s => <p>{s.name}</p>)}</div>
}

// Client Component — needs interactivity
"use client"
export default function LoginForm() {
  const [email, setEmail] = useState("")
  // ...
}
```

### 2. Next.js 16 Breaking Changes — Important

```tsx
// params and searchParams are now Promises — always await them
export default async function ShopPage({
  params,
}: {
  params: Promise<{ shopId: string }>
}) {
  const { shopId } = await params  // ← MUST await
  // ...
}

// headers() and cookies() are now async
import { headers } from "next/headers"
const session = await auth.api.getSession({ headers: await headers() })

// middleware.ts is DEPRECATED — use proxy.ts instead
// export default function middleware() { ... }  ← OLD
// export default function proxy() { ... }       ← NEW (proxy.ts)
```

### 3. Server Actions

All database mutations go in `actions/` files. Always:
- Put `"use server"` at the very top of every actions file
- Verify the session server-side before any DB write
- Return a typed result object — never throw naked errors to the client

```typescript
// actions/shop.actions.ts
"use server"

import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { prisma } from "@/lib/db"

export async function createShop(data: { name: string; category: string }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return { error: "Not authenticated" }
  if (session.user.role !== "SHOP_OWNER") return { error: "Forbidden" }

  const shop = await prisma.shop.create({
    data: { ...data, ownerId: session.user.id },
  })
  return { data: shop }
}
```

### 4. Prisma Client

The Prisma client is exported from `lib/db.ts` as `prisma`. Use it in Server Components and Server Actions.

```typescript
import { prisma } from "@/lib/db"

const shops = await prisma.shop.findMany({ where: { ownerId: userId } })
```

**Never import `prisma` in Client Components.** Client Components run in the browser — the DB connection would fail.

### 5. better-auth — Two Configs, Two Use Cases

| File | Used In | Purpose |
|------|---------|---------|
| `lib/auth.ts` | Server only | Configure auth, call `auth.api.*` |
| `lib/auth-client.ts` | Client only | UI auth calls (signIn, signUp, etc.) |

```typescript
// In a Server Component or Action:
import { auth } from "@/lib/auth"
const session = await auth.api.getSession({ headers: await headers() })

// In a Client Component:
import { authClient } from "@/lib/auth-client"
const result = await authClient.signIn.email({ email, password })
```

### 6. Error Handling Pattern

Use toast notifications for user feedback. Always import `toast` from `sonner`.

```typescript
"use client"
import { toast } from "sonner"

const handleSubmit = async () => {
  const result = await someAction(data)
  if (result.error) {
    toast.error(result.error)
    return
  }
  toast.success("Done!")
}
```

### 7. Routing — Role Prefixes

Every protected route belongs under a role prefix:

| Role | Prefix | Example |
|------|--------|---------|
| SUPER_ADMIN | `/admin` | `/admin/products` |
| SHOP_OWNER | `/shop-owner` | `/shop-owner/[shopId]` |
| SHOP_MANAGER | `/manager` | `/manager/[shopId]/orders` |
| CUSTOMER | `/customer` | `/customer/cart` |

`proxy.ts` enforces this automatically. If you add a new page, make sure it's under the correct prefix.

---

## Guide Documents

| # | Document | What It Covers | PRD Sprint |
|---|----------|----------------|-----------|
| 01 | [01-cleanup.md](./01-cleanup.md) | Delete old files, reset database | — |
| 02 | [02-schema.md](./02-schema.md) | Full Prisma schema + migration | — |
| 03 | [03-auth.md](./03-auth.md) | Authentication — all pages + proxy.ts | 1 |
| 04 | [04-shop-owner.md](./04-shop-owner.md) | Shop owner — shop, products, managers | 4–5 |
| 05 | [05-admin.md](./05-admin.md) | Seed, admin dashboard, catalog + import, users, shop visibility, returns overview | 2–3 |
| 06 | [06-manager.md](./06-manager.md) | Manager dashboard + product management (reuses owner UI) | 5 |
| 07 | [07-customer-shopping.md](./07-customer-shopping.md) | Customer browse, product detail, cart, checkout (one order per shop), addresses | 6 |
| 08 | [08-fulfillment.md](./08-fulfillment.md) | Order status transitions, cancel, status history — owner + manager | 7 |
| 09 | [09-customer-orders-returns.md](./09-customer-orders-returns.md) | Order tracking, customer cancel, returns, feedback | 8 |

Start with `01-cleanup.md`. By the end of `09`, the platform is feature-complete against the PRD.
