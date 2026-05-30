# Grocery Marketplace — Developer Guide

Build a complete, production-shaped grocery marketplace with **Next.js 16 · Prisma · Supabase Postgres · better-auth · Tailwind · shadcn/ui**, following the [PRD](../PRD.md).

> **New here?** Read [`00-overview.md`](./00-overview.md) first — it covers the tech stack, folder layout, and the core conventions (Server Components, Server Actions, async `params`/`headers`, `proxy.ts`, better-auth). Then work through the numbered documents **in order**, 01 → 10. Don't skip.

---

## The Sequence

| # | Document | What you build | PRD Sprint |
|---|----------|----------------|------------|
| 00 | [00-overview.md](./00-overview.md) | Conventions & architecture (read first) | — |
| 01 | [01-cleanup.md](./01-cleanup.md) | Delete old files, reset the database | — |
| 02 | [02-schema.md](./02-schema.md) | Full Prisma schema + migration | — |
| 03 | [03-auth.md](./03-auth.md) | Auth: sign up/in, reset, change password, `proxy.ts`, profile | 1 |
| 04 | [04-shop-owner.md](./04-shop-owner.md) | Shop owner: shops, products, managers | 4–5 |
| 05 | [05-admin.md](./05-admin.md) | Admin: seed, catalog + import, users, shop visibility, returns overview | 2–3 |
| 06 | [06-manager.md](./06-manager.md) | Manager: dashboard + product management | 5 |
| 07 | [07-customer-shopping.md](./07-customer-shopping.md) | Customer: browse, product detail, cart, checkout, addresses | 6 |
| 08 | [08-fulfillment.md](./08-fulfillment.md) | Order fulfillment: status transitions, cancel, history (owner + manager) | 7 |
| 09 | [09-customer-orders-returns.md](./09-customer-orders-returns.md) | Order tracking, returns, feedback | 8 |
| 10 | [10-corrections-and-hardening.md](./10-corrections-and-hardening.md) | Correctness & security fixes — **apply before going live** | — |

> Documents **05–10** were added after **00–04**. If you followed **00–04** earlier, just continue from **05** — those foundation files are unchanged. Document **10** then applies a handful of find-and-replace fixes to code you wrote in **03**, **04**, and **07** (manager login, stock-race, deactivation, guards) — each shown as a clear *Before → After*, so you never have to guess what changed.

---

## What You End Up With

A four-role marketplace that matches the PRD end to end:

- **Platform Admin** (`SUPER_ADMIN`) — owns the global catalog (add / edit / delete / CSV import), full read-only visibility into every shop owner, shop, order, and return, and can deactivate / reactivate any user.
- **Shop Owner** (`SHOP_OWNER`) — creates shops, builds inventory from the catalog with per-shop pricing, adds managers, fulfills orders through the full lifecycle, and approves / rejects / refunds returns.
- **Shop Manager** (`SHOP_MANAGER`) — manages a shop's products and fulfills its orders (no removal, no returns), with a forced password change on first login.
- **Customer** (`CUSTOMER`) — browses the catalog, compares shops, builds a cart across shops, checks out (**one order per shop**), tracks delivery, cancels, returns (7-day window), and leaves feedback.

Backed by: immutable order snapshots (name, price, address), an audited `OrderStatusHistory` on every transition, race-safe stock across placement / cancel / return, and `proxy.ts` + per-action role checks on every mutation.

---

## Before You Start

- Node.js 20.9+ and a Supabase Postgres database (connection string in `.env`).
- Read `00-overview.md`. Then begin at `01-cleanup.md`.
- Each document ends by pointing to the next. Finish each one (including its "Verify" steps) before moving on.
