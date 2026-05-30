# Student Guide — React Grocery Marketplace

Welcome. This guide will walk you through building a real, working grocery marketplace app using React.

You will build it feature by feature, from blank project to fully working application.  
Read every section before writing any code in it.

---

## What You Are Building

A local grocery marketplace with two types of users:

**Seller** — Someone who sells groceries online.
- Signs up with their shop name
- Adds products with prices and stock
- Receives orders from customers
- Updates order status (confirms, dispatches, delivers)

**Customer** — Someone who buys groceries online.
- Signs up and browses products from all sellers
- Adds products to cart (from one or multiple sellers)
- Places orders and tracks their status
- Leaves reviews after delivery

---

## Your Tech Stack

| Technology | What it does | Why you're using it |
|-----------|-------------|-------------------|
| **Vite** | Creates and runs your React project | Faster and simpler than Create React App |
| **React** | Your UI framework | You already know this |
| **React Router v6** | Handles page navigation (URLs) | Real apps have multiple pages |
| **json-server** | Fake backend that reads/writes a JSON file | You get a real REST API without writing any backend code |
| **Context API** | Shares the logged-in user across all components | You already know useState — Context is useState that any component can access |
| **shadcn/ui** | Pre-built UI components (buttons, cards, inputs) | You already know how to use these |
| **Tailwind CSS** | Styling | You already know this |

---

## How the App Works (Big Picture)

```
React App (localhost:5173)          json-server (localhost:3001)
       │                                      │
       │  fetch('/products')  ──────────────► │  reads db.json
       │  ◄──────────────────  [product list] │
       │                                      │
       │  fetch('/orders', POST) ──────────►  │  writes to db.json
       │  ◄──────────────────  [new order]    │
```

You run **two terminal windows** at the same time:
1. `npm run dev` → starts React on port 5173
2. `npm run server` → starts json-server on port 3001

Your React app talks to json-server using `fetch()`. json-server reads and writes from `db.json` automatically.

---

## What You Need to Know Before Starting

You already know:
- ✅ React components, props, state (`useState`)
- ✅ `useEffect` for running code when something changes
- ✅ Passing data via props
- ✅ Making API calls (you know the concept)
- ✅ shadcn components
- ✅ Tailwind CSS

New things you will learn in this project:
- **React Router** — navigate between pages without refreshing
- **Context API** — share data (like the logged-in user) without passing props everywhere
- **fetch()** — make HTTP requests (GET, POST, PUT, DELETE) without a library
- **localStorage** — save data in the browser (used for cart and session)

---

## Guide Documents

| # | File | What It Covers |
|---|------|----------------|
| 01 | [01-setup.md](./01-setup.md) | Create the project, install all tools, verify it runs |
| 02 | [02-data-and-auth.md](./02-data-and-auth.md) | json-server, db.json, API functions, login/logout |
| 03 | [03-seller.md](./03-seller.md) | All seller pages — dashboard, products, orders |
| 04 | [04-customer.md](./04-customer.md) | All customer pages — browse, cart, checkout, orders, reviews |

Start with `01-setup.md`.

---

## Target Folder Structure

By the end, your project will look like this:

```
grocery-marketplace/
│
├── db.json                          ← your entire "database" (json-server reads this)
│
├── src/
│   ├── api/                         ← all fetch() calls live here
│   │   ├── index.js                 ← base fetch helper
│   │   ├── users.js
│   │   ├── products.js
│   │   ├── orders.js
│   │   └── reviews.js
│   │
│   ├── context/
│   │   └── AuthContext.jsx          ← logged-in user, shared across all pages
│   │
│   ├── hooks/
│   │   └── useCart.js               ← cart state (saved in localStorage)
│   │
│   ├── components/
│   │   ├── ui/                      ← shadcn components (auto-generated)
│   │   ├── layout/
│   │   │   ├── Navbar.jsx
│   │   │   └── ProtectedRoute.jsx
│   │   └── shared/
│   │       ├── StarRating.jsx
│   │       └── StatusBadge.jsx
│   │
│   ├── pages/
│   │   ├── auth/
│   │   │   ├── SignIn.jsx
│   │   │   └── SignUp.jsx
│   │   ├── seller/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Products.jsx
│   │   │   └── Orders.jsx
│   │   └── customer/
│   │       ├── Browse.jsx
│   │       ├── ProductDetail.jsx
│   │       ├── Cart.jsx
│   │       ├── Checkout.jsx
│   │       ├── Orders.jsx
│   │       └── OrderDetail.jsx
│   │
│   ├── App.jsx                      ← all routes defined here
│   └── main.jsx                     ← entry point
│
├── package.json
└── vite.config.js
```
