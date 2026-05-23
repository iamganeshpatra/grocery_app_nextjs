# Developer Guide — 02: Database Schema

This document defines the complete Prisma schema for the entire platform.  
You set this up once now. Every sprint guide that follows uses this schema — you will not need to change it again.

---

## Step 1 — Replace prisma/schema.prisma

Open `prisma/schema.prisma` and replace **all** of its contents with the following:

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client"
  output   = "../app/generated/prisma"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Enums ────────────────────────────────────────────────────────────────────

enum Role {
  SUPER_ADMIN
  SHOP_OWNER
  SHOP_MANAGER
  CUSTOMER
}

enum OrderStatus {
  PENDING
  CONFIRMED
  PREPARING
  DISPATCHED
  DELIVERED
  CANCELLED
  RETURN_REQUESTED
  RETURN_APPROVED
  RETURN_REJECTED
  REFUNDED
}

enum ReturnStatus {
  PENDING
  APPROVED
  REJECTED
}

// ─── Auth Tables (managed by better-auth — do not rename or remove fields) ────

model User {
  id                 String  @id @default(cuid())
  name               String
  email              String  @unique
  role               Role    @default(CUSTOMER)
  emailVerified      Boolean @default(false)
  image              String?
  isActive           Boolean @default(true)
  mustChangePassword Boolean @default(false)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Auth relations
  sessions Session[]
  accounts Account[]

  // App relations
  addresses          Address[]
  orders             Order[]
  carts              Cart[]
  shops              Shop[]             @relation("ShopOwner")
  shopManagers       ShopManager[]
  reviews            ProductReview[]
  orderStatusChanges OrderStatusHistory[]
  returnRequests     OrderReturn[]      @relation("ReturnRequester")
  returnResolutions  OrderReturn[]      @relation("ReturnResolver")

  @@map("user")
}

model Session {
  id        String   @id
  expiresAt DateTime
  token     String   @unique

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  ipAddress String?
  userAgent String?

  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("session")
}

model Account {
  id         String  @id @default(cuid())
  accountId  String
  providerId String  // "credential" for email/password
  userId     String
  password   String? // bcrypt hash — only for credential provider

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("account")
}

model Verification {
  id         String   @id
  identifier String
  value      String
  expiresAt  DateTime

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([identifier])
  @@map("verification")
}

// ─── Catalog ──────────────────────────────────────────────────────────────────

model Product {
  id          String  @id @default(cuid())
  name        String
  description String?
  price       Float   // Reference price shown to shop owners when adding to shop
  category    String
  quantity    String  // Unit label, e.g. "500g", "1L", "1 piece"
  stock       Int     // Global reference stock (admin-managed)
  imageUrl    String?
  brand       String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  shopProducts ShopProduct[]
  orderItems   OrderItem[]
  carts        Cart[]
  reviews      ProductReview[]

  @@map("product")
}

// ─── Shops ────────────────────────────────────────────────────────────────────

model Shop {
  id           String  @id @default(cuid())
  name         String
  category     String
  description  String?
  contactPhone String?

  ownerId String
  owner   User   @relation("ShopOwner", fields: [ownerId], references: [id])

  shopManagers ShopManager[]
  shopProducts ShopProduct[]
  orders       Order[]
  carts        Cart[]
  reviews      ProductReview[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("shop")
}

model ShopProduct {
  id        String @id @default(cuid())
  shopId    String
  productId String
  stock     Int
  price     Float  // Shop-specific selling price (set by owner/manager)

  shop    Shop    @relation(fields: [shopId], references: [id], onDelete: Cascade)
  product Product @relation(fields: [productId], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // A product can be added to a shop only once
  @@unique([shopId, productId])
  @@map("shop_product")
}

model ShopManager {
  id     String @id @default(cuid())
  shopId String
  userId String

  shop Shop @relation(fields: [shopId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([shopId, userId])
  @@map("shop_manager")
}

// ─── Customer Shopping ────────────────────────────────────────────────────────

model Cart {
  id        String @id @default(cuid())
  userId    String
  productId String
  shopId    String // Which shop's price/stock to use
  quantity  Int

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user    User    @relation(fields: [userId], references: [id])
  product Product @relation(fields: [productId], references: [id])
  shop    Shop    @relation(fields: [shopId], references: [id])

  @@map("cart")
}

model Address {
  id        String  @id @default(cuid())
  userId    String
  fullName  String
  phone     String
  houseNo   String
  area      String
  landmark  String?
  city      String
  state     String
  pincode   String
  isDefault Boolean @default(false)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user   User    @relation(fields: [userId], references: [id])
  orders Order[]

  @@map("address")
}

// ─── Orders ───────────────────────────────────────────────────────────────────

model Order {
  id               String      @id @default(cuid())
  shopId           String      // One order per shop (see PRD Section 4)
  userId           String      // Customer
  addressId        String
  addressSnapshot  String      // Full address JSON copied at order creation — never recalculate
  totalAmount      Float
  status           OrderStatus @default(PENDING)
  cancellationNote String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  shop    Shop    @relation(fields: [shopId], references: [id])
  user    User    @relation(fields: [userId], references: [id])
  address Address @relation(fields: [addressId], references: [id])

  items         OrderItem[]
  statusHistory OrderStatusHistory[]
  returnRequest OrderReturn?

  @@map("order")
}

model OrderItem {
  id          String @id @default(cuid())
  orderId     String
  productId   String
  shopId      String
  productName String // Snapshot of product name at order time
  unitPrice   Float  // Snapshot of price at order time
  quantity    Int
  subtotal    Float  // Snapshot = unitPrice × quantity

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  order   Order   @relation(fields: [orderId], references: [id])
  product Product @relation(fields: [productId], references: [id])

  @@map("order_item")
}

model OrderStatusHistory {
  id              String   @id @default(cuid())
  orderId         String
  fromStatus      String?  // null for the initial PENDING entry
  toStatus        String
  changedByUserId String
  note            String?
  changedAt       DateTime @default(now())

  order     Order @relation(fields: [orderId], references: [id])
  changedBy User  @relation(fields: [changedByUserId], references: [id])

  @@map("order_status_history")
}

// ─── Returns & Reviews ────────────────────────────────────────────────────────

model OrderReturn {
  id                String       @id @default(cuid())
  orderId           String       @unique // One return request per order
  requestedByUserId String
  reason            String
  description       String?
  status            ReturnStatus @default(PENDING)
  rejectionReason   String?
  resolvedByUserId  String?
  requestedAt       DateTime     @default(now())
  resolvedAt        DateTime?

  order       Order  @relation(fields: [orderId], references: [id])
  requestedBy User   @relation("ReturnRequester", fields: [requestedByUserId], references: [id])
  resolvedBy  User?  @relation("ReturnResolver", fields: [resolvedByUserId], references: [id])

  @@map("order_return")
}

model ProductReview {
  id         String  @id @default(cuid())
  customerId String
  shopId     String
  productId  String
  orderId    String
  rating     Int     // 1–5
  comment    String?

  createdAt DateTime @default(now())

  customer User    @relation(fields: [customerId], references: [id])
  shop     Shop    @relation(fields: [shopId], references: [id])
  product  Product @relation(fields: [productId], references: [id])

  // One review per order (covers all items in that order)
  @@unique([customerId, orderId])
  @@map("product_review")
}
```

---

## Step 2 — Run the Migration

```bash
npx prisma migrate dev --name init
```

Expected output:

```
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "postgres" ...

✔  Generated Prisma Client (v7.x.x) to ./app/generated/prisma in 800ms
The following migration(s) have been created and applied:

migrations/
  └─ 20xxxxxx_init/
    └─ migration.sql

✔  Database is now in sync with your schema.
```

---

## Step 3 — Verify the Prisma Client Was Generated

```bash
ls app/generated/prisma/
```

You should see files like `client.ts`, `enums.ts`, `models/`, etc.

---

## Schema Notes — What Each Table Is For

| Table | Purpose |
|-------|---------|
| `user` | All users — customers, shop owners, managers, admin |
| `session` | Active login sessions (managed by better-auth) |
| `account` | Credential record — holds the bcrypt password hash (better-auth only) |
| `verification` | Email verification + password reset tokens (better-auth only) |
| `product` | Global product catalog — only admin can add/edit |
| `shop` | A shop created by a shop owner |
| `shop_product` | A product listed in a specific shop with a shop-specific price and stock |
| `shop_manager` | Junction: which users manage which shops |
| `cart` | Items a customer has added to their cart (with shop context) |
| `address` | Saved delivery addresses |
| `order` | One order per shop per checkout — immutable once created |
| `order_item` | Line items with name/price snapshots — never recalculated |
| `order_status_history` | Audit trail of every status change with who made it |
| `order_return` | Return request submitted by a customer |
| `product_review` | Rating + comment submitted after delivery |

---

## Critical Rules About This Schema

1. **Never add a `password` field to the `user` table.** Passwords live in `account.password` only.  
   better-auth reads credentials from the `account` table — it never reads `user.password`.

2. **`shop_product.price` is the selling price** — what the customer pays.  
   `product.price` is the reference price shown to the shop owner when they add the product.

3. **`order.addressSnapshot`** stores a JSON string of the full address at checkout time.  
   The `order.addressId` relation still exists for FK integrity, but always display the snapshot.

4. **`order_item.productName`, `unitPrice`, `subtotal`** are snapshots.  
   Once an order is placed, these values never change — even if the product is later deleted or repriced.

5. **`shop_product` has a unique constraint on `[shopId, productId]`.**  
   A product can only be added to a shop once. Attempting to add it twice will throw a Prisma error.

Now proceed to `03-auth.md`.
