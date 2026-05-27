# Product Requirements Document
## Local Grocery Marketplace Platform

**Version:** 1.2  
**Stack:** Next.js 16 · Prisma · Supabase Postgres · better-auth · Tailwind · shadcn/ui  
**Last Updated:** 2026-05-23

---

## 1. Product Overview

A multi-sided marketplace where **shop owners** list products from a shared catalog and manage local inventory, **managers** help maintain stock and fulfill orders, and **customers** browse products, compare shops, place orders, track delivery, leave feedback, and request returns.

The platform admin owns the global product catalog and has full read-only visibility into every shop owner, their shops, orders, and returns.

---

## 2. Goals

- A shop owner can set up a shop and start selling within minutes.
- A customer can find a product, compare shops, place an order, and track it to delivery — all in one flow.
- Managers reduce the burden on shop owners for day-to-day stock management and order fulfillment.
- Orders are immutable snapshots — price, product name, and delivery address never change after placement.
- The return and feedback cycle closes the loop after every delivery.

---

## 3. User Roles

| Role | Enum | Description |
|------|------|-------------|
| Platform Admin | `SUPER_ADMIN` | Owns the platform. Manages the global catalog. Read-only visibility into all shops, users, orders, and returns. |
| Shop Owner | `SHOP_OWNER` | Creates and owns one or more shops. Manages inventory, managers, fulfillment, and returns. |
| Shop Manager | `SHOP_MANAGER` | Assigned to one or more shops by an owner. Updates stock and fulfills orders. Cannot approve returns. |
| Customer | `CUSTOMER` | Browses products, places orders, tracks delivery, leaves feedback, and requests returns. |

---

## 4. Architectural Decision — Orders Per Shop

**One order is created per shop at checkout.**

When a customer's cart has items from shops A, B, and C, three separate `Order` records are created — one per shop. Each `Order` has a `shopId` that directly links it to the fulfilling shop.

**Why:** This makes every order's lifecycle independent. Shop A fulfills, ships, and handles returns for their order without any dependency on shops B or C. Queries for shop dashboards are simple (`WHERE shopId = X`). Revenue calculation per shop is direct.

**Customer experience:** On the checkout confirmation screen, the customer sees all order IDs created. On `/customer/orders`, all orders appear together regardless of shop, sorted by date.

---

## 5. Order Lifecycle

```
PENDING
  │
  ├─► CONFIRMED        ← Shop owner / manager accepts
  │       │
  │       ├─► PREPARING     ← Items being picked and packed
  │       │       │
  │       │       └─► DISPATCHED    ← Handed to delivery
  │       │                 │
  │       │                 └─► DELIVERED    ← Customer received the order
  │       │                           │
  │       │                    h       └─► RETURN_REQUESTED ← Customer raises return (within 7 days)
  │       │                                     │
  │       │                                     ├─► RETURN_APPROVED
  │       │                                     │         └─► REFUNDED  (cash, manual)
  │       │                                     └─► RETURN_REJECTED  (with reason)
  │       │
  │       └─► CANCELLED  (with note — before DISPATCHED)
  │
  └─► CANCELLED  (by customer — only at PENDING, before shop confirms)
```

**Who can trigger which transition:**

| Transition | SUPER_ADMIN | SHOP_OWNER | MANAGER | CUSTOMER |
|-----------|:-----------:|:----------:|:-------:|:--------:|
| PENDING → CONFIRMED | ❌ | ✅ | ✅ | ❌ |
| CONFIRMED → PREPARING | ❌ | ✅ | ✅ | ❌ |
| PREPARING → DISPATCHED | ❌ | ✅ | ✅ | ❌ |
| DISPATCHED → DELIVERED | ❌ | ✅ | ✅ | ❌ |
| Any → CANCELLED (before DISPATCHED) | ❌ | ✅ | ✅ | ✅ (PENDING only) |
| DELIVERED → RETURN_REQUESTED | ❌ | ❌ | ❌ | ✅ |
| RETURN_REQUESTED → APPROVED/REJECTED | ❌ | ✅ | ❌ | ❌ |
| RETURN_APPROVED → REFUNDED | ❌ | ✅ | ❌ | ❌ |

Every transition is written to `OrderStatusHistory` with the timestamp and the user who triggered it.

---

## 6. User Journeys

### 6.1 Platform Admin — Full Lifecycle

1. Admin account is created once via the seed script (`prisma/seed.ts`). There is no self-registration for admins.
2. Logs in → admin dashboard showing platform stats: total products, shop owners, shops, customers, total orders placed, total revenue (sum of DELIVERED order totals).
3. **Product Catalog:**
   - Adds products individually (dialog) or in bulk (Excel/CSV import).
   - Edits or deletes products. Before deleting, the system warns if any ShopProduct references the product and blocks deletion if any active orders (PENDING through DISPATCHED) contain it.
4. **Shop Owner directory:**
   - Views all `SHOP_OWNER` users. Clicks one → sees their shops.
   - Clicks a shop → reads shop details, product inventory, manager list, and order history (all read-only).
5. **Users page:** views all users across all roles. Can search by name, email, or role. Can deactivate a user (sets `isActive = false`; they cannot log in). Can reactivate.
6. **Returns overview:** views all return requests platform-wide with their current status.
7. **Profile:** can update their own name and change their password.

### 6.2 Shop Owner — Full Lifecycle

1. Sign up at `/signup/seller` → account created as `SHOP_OWNER`.
2. Logs in → seller dashboard lists their shops with a PENDING order badge on each.
3. **Create shop** → enters shop name, category, description, and contact phone → shop created → redirects to shop dashboard.
4. **Edit shop** → can update shop name, category, description, and contact phone at any time.
5. **Products tab:**
   - Left panel: type to search the global catalog. Results show name, category, brand, reference price. Click **+** → dialog to set stock quantity and shop price.
   - Right panel: current inventory. Each row has stock badge (green/orange/red), price, **Edit** (stock + price), **Remove**.
   - **Remove** is blocked if the product is in any active order (PENDING through DISPATCHED). A warning is shown.
   - Stock is automatically decremented when an order is placed, and restored when an order is cancelled or a return is approved.
6. **Managers tab:** view current managers, add by email, remove.
7. **Orders tab (with sub-tabs):** All | Pending | Active | Completed | Returns.
   - Each row: short order ID, customer name, item count, total, status badge, time elapsed.
   - Click an order → order detail page with full item list, delivery address, status timeline, and action panel.
   - Action panel shows the **one available next action** (e.g. "Confirm Order") plus a "Cancel" option (if before DISPATCHED, requires a cancellation note).
   - Cancelling an order restores stock for all items in that order.
8. **Returns tab:**
   - Lists orders at RETURN_REQUESTED status.
   - Click → reads customer reason → **Approve Return** or **Reject Return** (rejection requires a reason).
   - On approval: order moves to RETURN_APPROVED. Stock is restored.
   - Owner manually collects the product and returns cash, then clicks **Mark as Refunded** → order moves to REFUNDED.
9. **Profile:** updates name, changes password.

### 6.3 Shop Manager — Full Lifecycle

1. Account is created by a shop owner (by email). If the email is new, a `SHOP_MANAGER` account is created with a temporary password shown to the owner.
2. First login: after logging in with the temporary password, the manager is prompted to **change their password before continuing** (mandatory step).
3. Logs in → manager dashboard shows all shops they manage.
4. Clicks a shop → shop view with two tabs: **Products** and **Orders**.
5. **Products tab:** same split-panel as shop owner, but the **Remove** button is hidden. Can add products from catalog and update stock/price.
6. **Orders tab (sub-tabs):** All | Pending | Active | Completed.
   - No "Returns" sub-tab — managers cannot action returns.
   - Can transition orders: PENDING → CONFIRMED → PREPARING → DISPATCHED → DELIVERED.
   - Can cancel an order (before DISPATCHED) with a note. Stock is restored on cancel.
7. **Profile:** updates name, changes password.

### 6.4 Customer — Full Lifecycle

1. Sign up at `/signup/customer` → account created as `CUSTOMER`.
2. Logs in → product browse page showing the global catalog.
3. **Browse:** search by name, filter by category. Each product card shows image, name, brand, and the lowest price available across shops.
4. **Product detail** (`/customer/product/[productId]`): shows product info. Below it, list of shops that carry it — each shop card shows: shop name, available stock, price. If stock = 0 → "Out of Stock" badge, no Add button.
5. **Add to cart:** selects quantity (max = available stock) per shop. Can add same product from multiple shops.
6. **Cart** (`/customer/cart`): lists all items with product name, shop name, quantity stepper, unit price, subtotal. Can remove items. Cart total shown.
7. **Checkout** (`/customer/checkout`):
   - Selects a saved address or adds a new one.
   - Before creating orders, the server validates that each cart item's quantity ≤ current ShopProduct.stock. If any item fails validation, the user is redirected to the cart with a warning on the affected items. They must adjust quantities or remove items.
   - If validation passes: one `Order` is created **per shop** in the cart (see Section 4). Each order's delivery address snapshot (fullName, phone, full address string) is copied into the Order record at creation time.
   - Stock is decremented per item across all created orders.
   - Cart is cleared. Redirect to confirmation page showing all order IDs created.
8. **Order tracking** (`/customer/orders/[orderId]`):
   - Shows: items snapshot (name, qty, unit price — never recalculated), delivery address snapshot, status timeline with timestamps from `OrderStatusHistory`.
   - If CANCELLED: shows cancellation note.
   - If PENDING: shows a **Cancel Order** button. Clicking it → confirmation dialog → order cancelled, stock restored, status → CANCELLED with note "Cancelled by customer."
   - If DELIVERED (within 7 days): shows **Leave Feedback** and **Request Return** buttons (if not already done).
9. **Feedback** (`/customer/orders/[orderId]/feedback`):
   - Available only once per order, only after DELIVERED.
   - Fields: star rating (1–5), optional written comment.
   - After submitting, button on order detail changes to "Feedback Submitted."
10. **Return request** (`/customer/orders/[orderId]/return`):
    - Available only if status = DELIVERED, no return already exists, and fewer than 7 days have passed since the DELIVERED timestamp in `OrderStatusHistory`.
    - Server enforces the 7-day window — not just the UI.
    - Fields: reason (required), optional description.
    - On submit → order status → RETURN_REQUESTED.
    - Customer can see the return decision (APPROVED/REJECTED + rejection reason) on the order detail page.
11. **Addresses** (`/customer/addresses`): manage saved addresses. Edit, delete, set default. Deleting an address that is linked to any past order is blocked — that address is kept for order history integrity.
12. **Profile:** updates name, changes password.

---

## 7. Route Map

```
/                                               → Landing page (marketing)
/signin                                         → Unified sign-in (all roles)
/signup                                         → Choose Seller or Customer
/signup/seller                                  → Seller registration
/signup/customer                                → Customer registration
/forgot-password                                → Request password reset link
/reset-password                                 → Set new password (via token)
/change-password                                → Forced on first login for managers
/profile                                        → Profile settings (all roles, shows by role)
/auth-redirect                                  → Role-based redirect after login
/unauthorized                                   → Access denied

── ADMIN ─────────────────────────────────────────────────────────────
/admin                                          → Dashboard (platform stats)
/admin/products                                 → Global product catalog (search, paginated)
/admin/products/import                          → Excel/CSV bulk import
/admin/products/[productId]/edit                → Edit product
/admin/shop-owners                              → All SHOP_OWNER users (search)
/admin/shop-owners/[userId]                     → One owner's shops
/admin/shop-owners/[userId]/shops/[shopId]      → Shop detail (read-only: products, managers, orders)
/admin/users                                    → All users, all roles (search, filter by role)
/admin/returns                                  → All return requests platform-wide

── SHOP OWNER ────────────────────────────────────────────────────────
/shop-owner                                     → Seller dashboard (all their shops)
/shop-owner/new                                 → Create shop
/shop-owner/[shopId]                            → Shop dashboard (stats)
/shop-owner/[shopId]/edit                       → Edit shop details
/shop-owner/[shopId]/products                   → Manage shop inventory (split panel)
/shop-owner/[shopId]/managers                   → Manage managers
/shop-owner/[shopId]/orders                     → Orders list (tabbed)
/shop-owner/[shopId]/orders/[orderId]           → Order detail + fulfillment + return actions

── MANAGER ───────────────────────────────────────────────────────────
/manager                                        → Manager dashboard (managed shops)
/manager/[shopId]                               → Shop view for manager
/manager/[shopId]/products                      → Manage products (add/update, no delete)
/manager/[shopId]/orders                        → Orders list (All / Pending / Active / Completed)
/manager/[shopId]/orders/[orderId]              → Order detail + fulfillment actions (no return actions)

── CUSTOMER ──────────────────────────────────────────────────────────
/customer                                       → Product browse (global catalog grid)
/customer/product/[productId]                   → Product detail + shops offering it + ratings
/customer/cart                                  → Cart
/customer/checkout                              → Address + order summary + place order
/customer/checkout/confirmation                 → Post-order confirmation (all order IDs)
/customer/orders                                → Order history (All / Active / Completed / Returns)
/customer/orders/[orderId]                      → Order detail + status timeline + actions
/customer/orders/[orderId]/feedback             → Leave feedback (post-delivery, once)
/customer/orders/[orderId]/return               → Submit return request
/customer/addresses                             → Manage saved addresses
```

---

## 8. Data Schema

Fields marked *(exists)* are already in the database. Fields marked *(add)* need a new migration.

### User *(exists + add)*
```
id, name, email, role, emailVerified, image,
isActive (add, Boolean, default true),   ← for admin deactivation
createdAt, updatedAt
```

### Product *(exists)*
```
id, name, description, price (reference), category,
quantity (unit label), stock, imageUrl, brand,
createdAt, updatedAt
```

### Shop *(exists + add)*
```
id, name, category,
description (add, String?, short blurb about the shop),
contactPhone (add, String?),
ownerId (→ User),
managers (→ User[] via _ShopManagers),
createdAt, updatedAt
```

### ShopProduct *(exists + add)*
```
id,
shopId (→ Shop),         ← ensure this exists, not just userId
productId (→ Product),
userId (→ User, owner for legacy — phase out in favour of shopId),
stock,
price (add, Float),      ← shop-specific selling price
createdAt, updatedAt
```

### Cart *(exists + add)*
```
id, userId (→ User), productId (→ Product),
shopId (→ Shop) (add),   ← identifies which shop's price/stock to use
quantity, createdAt, updatedAt
```

### Address *(exists)*
```
id, userId, fullName, phone, houseNo, area, landmark,
city, state, pincode, isDefault, createdAt, updatedAt
```
> Addresses linked to any Order cannot be deleted. Enforce in the delete server action.

### Order *(exists + add)*
```
id,
shopId (→ Shop) (add),          ← one order per shop (see Section 4)
userId (→ User, customer),
addressId (→ Address),
addressSnapshot (add, String),  ← full address as a single JSON/text snapshot
totalAmount,
status (expand enum — see Section 5),
cancellationNote (add, String?),
createdAt, updatedAt
```

### OrderStatusHistory *(add)*
```
id, orderId (→ Order),
fromStatus, toStatus,
changedByUserId (→ User),
note (String?, optional comment),
changedAt (DateTime)
```

### OrderItem *(exists + add)*
```
id, orderId (→ Order),
productId (→ Product),
shopId (→ Shop) (add),
productName (add, String — snapshot),
unitPrice (add, Float — snapshot),
quantity,
subtotal (add, Float — snapshot),
createdAt, updatedAt
```
> Never recalculate from live product/shop data. These values are frozen at order creation.

### OrderReturn *(add)*
```
id, orderId (→ Order),
requestedByUserId (→ User, customer),
reason (String, required),
description (String?),
status (PENDING | APPROVED | REJECTED),
rejectionReason (String?),
resolvedByUserId (→ User?, shop owner),
requestedAt (DateTime),
resolvedAt (DateTime?)
```

### ProductReview *(add)*
```
id,
customerId (→ User),
shopId (→ Shop),
productId (→ Product),
orderId (→ Order),
rating (Int, 1–5),
comment (String?),
createdAt
```
> Unique constraint on `(customerId, orderId)` — one review per order.

---

## 9. Feature Specifications

### 9.1 Authentication & Route Protection

- **Sign in** (`/signin`): email + password. On success → `/auth-redirect` reads session role → redirects to correct dashboard. If `isActive = false` → show "Your account has been deactivated. Contact support." and do not create a session.
- **Sign up seller** (`/signup/seller`): First Name, Last Name (combined into `name`), Email, Password, Confirm Password → creates `SHOP_OWNER`.
- **Sign up customer** (`/signup/customer`): same fields → creates `CUSTOMER`.
- **Forgot password** (`/forgot-password`): enter email → if account exists, better-auth sends a reset link. Display "If this email exists, a reset link has been sent" regardless.
- **Reset password** (`/reset-password`): consumed from email link → enter new password + confirm.
- **Change password** (forced, `/change-password`): triggered on first login for `SHOP_MANAGER` accounts created by shop owners. Cannot skip. After changing, redirected to manager dashboard.
- **`proxy.ts`**: intercepts all requests. Unauthenticated → `/signin`. Wrong role → `/unauthorized`. Deactivated account sessions are invalidated.
- **Server actions** must independently verify session role before any DB write. A valid session cookie alone is not sufficient — the role must be confirmed server-side on every mutation.

### 9.2 Profile Management (all roles, `/profile`)

- Displays current name and email.
- **Update Name**: text field, save → updates `user.name`.
- **Change Password**: current password, new password, confirm new password. Validates current password via better-auth before updating.
- Email cannot be changed (would break auth identity).

### 9.3 Product Catalog (Admin)

- **List** (`/admin/products`): paginated table, search by name/category/brand.
- **Add** (dialog): Name, Category, Brand, Description, Reference Price, Unit (e.g. "500g"), Image URL.
- **Edit** (dialog, pre-filled): same fields.
- **Delete**: confirmation dialog.
  - Block if any active order (PENDING through DISPATCHED) contains this product — show count.
  - Warn (but allow) if ShopProduct records reference it — removing the product removes it from those shops' inventories.
- **Import** (`/admin/products/import`): upload `.xlsx` or `.csv`. Required columns: `name`, `category`, `brand`, `price`, `unit`. Show preview table, report success/error row counts after save.

### 9.4 Admin — Users & Shops

- **Shop Owners** (`/admin/shop-owners`): list all `SHOP_OWNER` users — name, email, shop count, date joined. Search by name/email.
  - Click owner → `/admin/shop-owners/[userId]` → their shops as cards (name, category, product count, order count, total revenue from DELIVERED orders).
  - Click a shop → `/admin/shop-owners/[userId]/shops/[shopId]` → read-only: products with stock and price, managers list, orders table with status.
- **All Users** (`/admin/users`): searchable, filterable by role. Each row: name, email, role badge, joined date, status (Active / Deactivated).
  - **Deactivate** button → sets `isActive = false`. Any active sessions for that user are invalidated.
  - **Reactivate** button → sets `isActive = true`.
- **Returns** (`/admin/returns`): all `OrderReturn` records platform-wide. Filterable by status. Read-only — admin cannot modify returns.

### 9.5 Shop Management (Shop Owner)

- **Dashboard** (`/shop-owner`): card per shop — name, category, product count, manager count, PENDING orders badge.
- **Create shop** (`/shop-owner/new`): Shop Name, Category, Description (optional), Contact Phone (optional). Submit → redirect to `/shop-owner/[shopId]`.
- **Edit shop** (`/shop-owner/[shopId]/edit`): same fields, pre-filled.
- **Shop dashboard** (`/shop-owner/[shopId]`): stats for this shop:
  - Products in inventory, total managers, orders today, revenue today (sum of DELIVERED order totals for today, WHERE shopId = this shop).

### 9.6 Manage Shop Products (Owner + Manager)

- **Left panel** (search):
  - Empty on load. Placeholder: "Search the product catalog by name or category."
  - Results: product name, category, brand, reference price. **+ Add** button.
  - Products already in the shop are shown with an "Already Added" badge and no Add button.
- **+ Add** dialog: Stock (required, number ≥ 1), Price (required, number > 0, defaults to reference price). Save → creates `ShopProduct`.
- **Right panel** (inventory):
  - Empty state: "No products in your shop yet. Search and add products from the catalog."
  - Each row: product image, name, category, stock badge (red = 0, orange = 1–4, green = 5+), price, **Edit** button, **Remove** button (owner only).
  - **Edit** dialog: update stock and price.
  - **Remove**: confirmation dialog. Blocked (with error) if the product is in any active order (PENDING through DISPATCHED). Allowed if all orders containing this item are DELIVERED, CANCELLED, or REFUNDED.

### 9.7 Manage Managers (Shop Owner)

- List: name, email, date added, **Remove** button.
- **Add Manager** (by email):
  - If a `SHOP_MANAGER` user exists with that email and is active → link to shop (append to `_ShopManagers`).
  - If a `SHOP_MANAGER` user exists but is already in this shop → show "Already a manager of this shop."
  - If the email belongs to another role → show "This email is registered as [role]. Only SHOP_MANAGER accounts can be added."
  - If no user exists → create `SHOP_MANAGER` account, generate temporary password (`Welcome@<ShopName>1`), display it once in the UI with a copy button, link to shop. The manager must change this password on first login.
- **Remove manager**: unlinks from shop (`_ShopManagers`). The manager's account is not deleted — they may manage other shops.

### 9.8 Order Fulfillment (Shop Owner + Manager)

- **Orders list** (`/shop-owner/[shopId]/orders`, `/manager/[shopId]/orders`):
  - Sub-tabs: **All** | **Pending** | **Active** (CONFIRMED/PREPARING/DISPATCHED) | **Completed** (DELIVERED/CANCELLED/REFUNDED) | **Returns** (owner only).
  - Each row: short order ID, customer name, item count, total, status badge, time since order placed, quick-action button.
- **Order detail** (`…/orders/[orderId]`):
  - Header: order ID, shop name, created timestamp.
  - Customer info: name, phone (from address snapshot).
  - Delivery address (from snapshot — never the live address record).
  - Items table: product name, quantity, unit price (all from snapshot), subtotal per row, order total.
  - **Status timeline**: vertical steps — PENDING, CONFIRMED, PREPARING, DISPATCHED, DELIVERED. Each completed step shows timestamp and who triggered it (from `OrderStatusHistory`).
  - **Action panel**: one primary action button showing the next logical step. Plus a secondary **Cancel Order** button (before DISPATCHED). Cancellation requires a mandatory note. On cancel, stock is restored for all items in this order.
  - After cancelling or completing: action panel is replaced with a read-only summary.

### 9.9 Return Management (Shop Owner only)

- Returns tab in `/shop-owner/[shopId]/orders` (filtered to RETURN_REQUESTED status).
- Each row: order ID, customer name, date requested, reason summary.
- Click → order detail page shows the return section below the order info:
  - Customer's reason and description.
  - **Approve Return** button → order status → RETURN_APPROVED. Stock for all items in the order is restored (items are assumed returned and resaleable).
  - **Reject Return** → text input for rejection reason (required) → order status → RETURN_REJECTED. Customer sees this reason.
  - After approval: **Mark as Refunded** button appears → order status → REFUNDED.

### 9.10 Customer — Browse & Product Detail

- **Browse** (`/customer`):
  - Grid of all products from the global catalog.
  - Search bar (queries name and category). Category filter chips.
  - Each card: image, name, brand, "From ₹X" (lowest ShopProduct price across all shops carrying it, only where stock > 0). If no shop carries it: "Not available" badge.
  - Empty state (no search results): "No products found for '[query]'. Try a different search."
- **Product detail** (`/customer/product/[productId]`):
  - Product info: image, name, category, brand, description, unit.
  - Shop cards below: shop name, shop category, stock, price, average rating for this product from this shop (average of `ProductReview.rating` WHERE shopId AND productId), Add to Cart button + quantity selector.
  - Out of stock: "Out of Stock" badge, no Add button.
  - No shops carry this product: "No shops are currently offering this product."
  - Reviews section: list of customer reviews (rating, comment, date) for this product across all shops.

### 9.11 Cart

- **Cart** (`/customer/cart`):
  - Empty state: "Your cart is empty. [Browse Products] button."
  - Items grouped (optional) or flat list: product image, name, shop name, quantity stepper (min 1, max = current ShopProduct.stock), unit price, subtotal, Remove button.
  - Warning banner on any item if its ShopProduct.stock has dropped below the cart quantity since it was added.
  - Cart total at bottom.
  - **Proceed to Checkout** button. Disabled if cart is empty.

### 9.12 Checkout & Order Placement

- **Checkout** (`/customer/checkout`):
  - **Address section**: radio list of saved addresses with "Add New Address" option (inline form). Set as default checkbox.
  - **Order summary**: items grouped by shop, subtotal per shop, grand total. Payment method label: "Cash on Delivery."
  - **Place Order** button → server action:
    1. Re-validates stock for every cart item. If any item has insufficient stock → abort, redirect to cart with per-item warnings.
    2. Groups cart items by `shopId`.
    3. For each group: creates one `Order` with `shopId`, `userId`, `addressId`, `addressSnapshot` (serialised full address), `totalAmount` for that group, status = `PENDING`.
    4. Creates `OrderItem` records with snapshots: `productName`, `unitPrice`, `subtotal`.
    5. Decrements `ShopProduct.stock` for each item.
    6. Writes the initial `OrderStatusHistory` record (fromStatus = null, toStatus = PENDING).
    7. Deletes all `Cart` records for this user.
    8. Redirects to `/customer/checkout/confirmation`.
- **Confirmation** (`/customer/checkout/confirmation`):
  - "Order(s) placed successfully!" message.
  - Lists all order IDs created (one per shop) with shop name and total. Each links to `/customer/orders/[orderId]`.
  - Button: "Continue Shopping" → `/customer`.

### 9.13 Order Tracking (Customer)

- **Order history** (`/customer/orders`):
  - Tabs: **All** | **Active** (PENDING/CONFIRMED/PREPARING/DISPATCHED) | **Completed** (DELIVERED/REFUNDED) | **Cancelled** | **Returns** (RETURN_REQUESTED/APPROVED/REJECTED).
  - Each row: order ID, shop name, item count, total, status badge, order date.
  - Empty state: "You haven't placed any orders yet. [Start Shopping] button."
- **Order detail** (`/customer/orders/[orderId]`):
  - Items snapshot table (product name, qty, unit price, subtotal — never recalculated).
  - Delivery address from `addressSnapshot` (not from Address table).
  - Status timeline: horizontal or vertical steps. Completed steps show timestamp from `OrderStatusHistory`; future steps are greyed out.
  - If status = PENDING: **Cancel Order** button (confirmation dialog → "Are you sure? This cannot be undone.") → cancels order, restores stock.
  - If status = CANCELLED: shows cancellation note below timeline.
  - If status = DELIVERED and < 7 days since DELIVERED timestamp:
    - **Leave Feedback** button (if no review yet).
    - **Request Return** button (if no return yet).
  - If status = DELIVERED and ≥ 7 days: buttons are gone. A note says "The 7-day return and feedback window has closed."
  - If a review was submitted: shows the star rating and comment the customer gave.
  - If a return exists: shows return status + rejection reason if REJECTED.

### 9.14 Feedback

- **Feedback page** (`/customer/orders/[orderId]/feedback`):
  - Only accessible if order status = DELIVERED and no review exists yet.
  - Shows which shop and which items are being reviewed.
  - Fields: star rating (1–5, required), written comment (optional, max 500 chars).
  - Submit → creates `ProductReview` for each `OrderItem.productId` + `shopId`, all sharing the same `orderId`. Only one review per order (unique on `customerId` + `orderId`).
  - On success: redirected back to order detail with "Feedback submitted. Thank you!" toast.

### 9.15 Return Request (Customer)

- **Return page** (`/customer/orders/[orderId]/return`):
  - Only accessible if: status = DELIVERED, no existing `OrderReturn` for this order, and the DELIVERED timestamp in `OrderStatusHistory` is within the last 7 days. Server enforces this — not just the UI.
  - Fields: reason (required, text), description (optional).
  - Submit → creates `OrderReturn` record, sets order status to RETURN_REQUESTED, writes to `OrderStatusHistory`.
  - Customer sees the return decision on the order detail page when the owner acts on it.

### 9.16 Address Management (Customer)

- **Addresses** (`/customer/addresses`):
  - List of all saved addresses with full details, Default badge, Edit and Delete buttons.
  - **Add Address**: form — fullName, phone, houseNo, area, landmark, city, state, pincode, isDefault checkbox.
  - **Edit**: same form, pre-filled.
  - **Delete**: allowed only if the address is not linked to any Order. If linked → show "This address is associated with orders and cannot be deleted."
  - Setting a new address as default automatically unsets the previous default.

---

## 10. Empty States (all roles)

| Screen | Empty State Message |
|--------|-------------------|
| `/shop-owner` | "You haven't created any shops yet. [Create Your First Shop]" |
| `/shop-owner/[shopId]/products` right panel | "No products in your shop yet. Search the catalog on the left to add some." |
| `/shop-owner/[shopId]/managers` | "No managers added yet. Add a manager by email above." |
| `/shop-owner/[shopId]/orders` | "No orders yet. Orders will appear here when customers purchase from your shop." |
| `/manager` | "You are not assigned to any shops yet. Ask a shop owner to add you." |
| `/manager/[shopId]/orders` | "No orders yet for this shop." |
| `/customer` (no products) | "No products available yet." |
| `/customer` (no search results) | "No products found for '[query]'. Try a different search." |
| `/customer/product/[productId]` (no shops) | "No shops are currently offering this product." |
| `/customer/cart` | "Your cart is empty. [Browse Products]" |
| `/customer/orders` | "You haven't placed any orders yet. [Start Shopping]" |
| `/admin/shop-owners/[userId]` (no shops) | "This shop owner hasn't created any shops yet." |
| `/admin/returns` | "No return requests found." |

---

## 11. Sprint Plan

### Sprint 1 — Foundation & Auth
**Goal:** All roles can register, log in, and land on their correct dashboard.

- [ ] Landing page (`/`) — marketing copy, Sign In + Sign Up CTAs
- [ ] `/signup` — Seller / Customer selection
- [ ] `/signup/seller` — registration → SHOP_OWNER
- [ ] `/signup/customer` — registration → CUSTOMER
- [ ] `/signin` — unified login → calls `/auth-redirect`
- [ ] `/auth-redirect` — reads role → redirects
- [ ] `proxy.ts` — protects all role-prefixed routes, checks `isActive`
- [ ] `/unauthorized` page
- [ ] `/forgot-password` → better-auth password reset request
- [ ] `/reset-password` → better-auth new password form
- [ ] `/change-password` — forced first-login for SHOP_MANAGER
- [ ] `/profile` — update name, change password (all roles)

---

### Sprint 2 — Admin: Product Catalog
**Goal:** Admin can build and maintain the global product catalog.

- [ ] Schema: add `isActive` to User → migration
- [ ] `/admin` — dashboard: product count, shop owner count, shop count, customer count, total orders, total revenue
- [ ] `/admin/products` — paginated, searchable product table
- [ ] Add product dialog
- [ ] Edit product dialog
- [ ] Delete product — block if in active orders, warn if in ShopProduct
- [ ] `/admin/products/import` — Excel/CSV with preview

---

### Sprint 3 — Admin: Users & Shop Visibility
**Goal:** Admin has full read visibility into the platform.

- [ ] `/admin/users` — all users, filterable by role, Deactivate/Reactivate
- [ ] `/admin/shop-owners` — list of SHOP_OWNER users
- [ ] `/admin/shop-owners/[userId]` — their shops (stats)
- [ ] `/admin/shop-owners/[userId]/shops/[shopId]` — read-only shop detail
- [ ] `/admin/returns` — all return requests, filterable by status

---

### Sprint 4 — Shop Owner: Shops & Managers
**Goal:** Owner can create shops and assign managers.

- [ ] Schema: add `description`, `contactPhone` to Shop → migration
- [ ] `/shop-owner` — list shops with PENDING order badges
- [ ] `/shop-owner/new` — create shop form
- [ ] `/shop-owner/[shopId]` — dashboard with today's stats
- [ ] `/shop-owner/[shopId]/edit` — edit shop details
- [ ] `/shop-owner/[shopId]/managers` — list, add, remove
- [ ] Add manager server action (find or create SHOP_MANAGER, show temp password)

---

### Sprint 5 — Manage Shop Products (Owner + Manager)
**Goal:** Shop inventory can be built from the global catalog.

- [ ] Schema: add `price` to ShopProduct, add `shopId` to Cart → migration
- [ ] `/shop-owner/[shopId]/products` — split-panel UI
- [ ] Product search → left panel
- [ ] Add to shop dialog (stock + price, "Already Added" badge)
- [ ] Edit stock/price dialog
- [ ] Remove from shop (owner only, blocked on active orders)
- [ ] `/manager` — managed shops list
- [ ] `/manager/[shopId]/products` — same UI, no remove button

---

### Sprint 6 — Customer: Browse, Cart & Checkout
**Goal:** Customer can find products, build a cart, and place an order.

- [ ] `/customer` — product grid, search, category filter, "From ₹X" pricing, empty states
- [ ] `/customer/product/[productId]` — shops offering it, ratings, Add to Cart
- [ ] `/customer/cart` — qty stepper, subtotals, empty state, out-of-stock warnings
- [ ] `/customer/checkout` — address selection/add, order summary, stock validation
- [ ] Schema: add `shopId` + `addressSnapshot` to Order, add snapshot fields to OrderItem → migration
- [ ] Place order server action — group by shop, create N orders, decrement stock, clear cart
- [ ] `/customer/checkout/confirmation` — all order IDs listed
- [ ] `/customer/addresses` — manage saved addresses

---

### Sprint 7 — Order Fulfillment (Shop Owner + Manager)
**Goal:** Shop staff can receive and fulfill orders end-to-end.

- [ ] Schema: expand Order status enum, add `cancellationNote` → migration
- [ ] Schema: create `OrderStatusHistory` table → migration
- [ ] `/shop-owner/[shopId]/orders` — tabbed list (All/Pending/Active/Completed/Returns)
- [ ] `/shop-owner/[shopId]/orders/[orderId]` — detail with timeline, action panel
- [ ] Status transition server actions with `OrderStatusHistory` writes
- [ ] Cancel order — require note, restore stock
- [ ] `/manager/[shopId]/orders` — same list (no Returns tab)
- [ ] `/manager/[shopId]/orders/[orderId]` — detail + fulfillment actions (no return buttons)

---

### Sprint 8 — Customer Order Tracking & Returns
**Goal:** Customer has full post-order visibility and can cancel, return, and rate.

- [ ] `/customer/orders` — order history with tabs, empty state
- [ ] `/customer/orders/[orderId]` — detail: snapshot items, address snapshot, status timeline with timestamps, Cancel button (PENDING only)
- [ ] Customer cancel server action — restore stock
- [ ] Schema: create `OrderReturn` table → migration
- [ ] `/customer/orders/[orderId]/return` — return form, 7-day server-side enforcement
- [ ] Return server action — creates OrderReturn, sets status to RETURN_REQUESTED
- [ ] Returns tab in `/shop-owner/[shopId]/orders`
- [ ] Approve return server action — RETURN_APPROVED, restore stock
- [ ] Reject return server action — RETURN_REJECTED with reason
- [ ] Mark as refunded — REFUNDED
- [ ] Customer sees return decision + rejection reason on order detail
- [ ] Schema: create `ProductReview` table → migration
- [ ] `/customer/orders/[orderId]/feedback` — star rating + comment form
- [ ] Submit feedback server action — unique constraint on (customerId, orderId)
- [ ] Product detail page shows per-shop average rating and reviews list

---

## 12. Rules & Constraints

| Rule | Detail |
|------|--------|
| **One order per shop** | At checkout, cart items are grouped by `shopId`. One `Order` record per shop is created. `Order.shopId` is mandatory. |
| **Catalog ownership** | Only `SUPER_ADMIN` can add, edit, or delete global products. |
| **Shop product delete guard** | A ShopProduct cannot be removed if it is in any active order (PENDING through DISPATCHED). |
| **Order immutability** | `OrderItem` stores snapshots: `productName`, `unitPrice`, `subtotal`. `Order` stores `addressSnapshot`. These are never recalculated or re-fetched from live data. |
| **Stock management** | Decremented at order placement. Restored when an order is CANCELLED (by any party) or when a return is APPROVED. |
| **Status transitions** | No state can be skipped. Must follow the exact sequence defined in Section 5. Written to `OrderStatusHistory` on every change. |
| **Customer cancellation** | Customer may only cancel an order at PENDING status, before the shop has confirmed it. |
| **Return window** | Return can only be requested within 7 days of the DELIVERED timestamp in `OrderStatusHistory`. Enforced server-side. |
| **Return authority** | Only `SHOP_OWNER` can approve or reject returns and mark as refunded. `SHOP_MANAGER` cannot. |
| **Manager first-login** | A `SHOP_MANAGER` created by a shop owner must change their temporary password before accessing any other page. |
| **One review per order** | `ProductReview` has a unique constraint on `(customerId, orderId)`. One review per order, regardless of how many items it contains. |
| **Address non-deletion** | An address linked to any Order record cannot be deleted. It is preserved for order history integrity. |
| **User deactivation** | Admin can deactivate any user. Deactivated users cannot log in and existing sessions are invalidated. |
| **Admin delete product guard** | Deleting a product is blocked if any active order (PENDING through DISPATCHED) contains it. |
| **Payment** | Cash on Delivery only. No payment gateway in v1. Refunds are marked manually by the shop owner. |
| **Auth** | All role-restricted routes protected by `proxy.ts`. Server actions independently verify session role before any DB write. |
| **No password in User table** | Passwords are managed by better-auth via the `account` table only. |
| **Admin is read-only for shops** | Admin cannot modify shop products, managers, orders, or returns — only view them and manage users/catalog. |
| **Price per shop** | `ShopProduct.price` is the selling price. `Product.price` is a reference default shown during the "Add to Shop" flow. |

---

## 13. Out of Scope (v1)

- Online payment gateway
- Push / email notifications
- Promotions and discount codes
- Multi-image per product
- Live GPS delivery tracking
- Inventory restock alerts
- Mobile app
- Seller analytics dashboard
- Customer wishlists
- In-app messaging between customer and shop
- Shop operating hours
- Geographic shop discovery (map view)
