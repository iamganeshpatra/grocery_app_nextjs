# Student Guide — 01: Project Setup

In this section you will:
1. Create a new React project with Vite
2. Install all dependencies
3. Set up shadcn/ui and Tailwind
4. Set up json-server (your fake backend)
5. Create the folder structure
6. Verify everything runs

---

## Step 1 — Create the Project

Open a terminal, go to wherever you keep your projects, and run:

```bash
npm create vite@latest grocery-marketplace -- --template react
cd grocery-marketplace
npm install
```

This creates a new React project using **Vite** as the build tool.

---

## Step 2 — Install All Dependencies

Run all of these in one go:

```bash
npm install react-router-dom
npm install -D json-server
npm install tailwindcss @tailwindcss/vite
```

- `react-router-dom` — for page navigation
- `json-server` — your fake backend (installed as a dev tool only)
- `tailwindcss` — CSS utility classes

---

## Step 3 — Set Up Tailwind CSS

Open `vite.config.js` and replace its contents with:

```js
// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

Open `src/index.css` and replace everything with just this one line:

```css
@import "tailwindcss";
```

---

## Step 4 — Set Up shadcn/ui

Run this to initialise shadcn:

```bash
npx shadcn@latest init
```

When it asks questions, choose:
- **Style**: Default
- **Base color**: Neutral
- **CSS variables**: Yes

Then install the shadcn components you will use:

```bash
npx shadcn@latest add button
npx shadcn@latest add input
npx shadcn@latest add card
npx shadcn@latest add badge
npx shadcn@latest add textarea
npx shadcn@latest add dialog
npx shadcn@latest add select
npx shadcn@latest add separator
```

These will all appear in `src/components/ui/`.

---

## Step 5 — Create the Folder Structure

Run these commands to create all the folders you need:

```bash
mkdir -p src/api
mkdir -p src/context
mkdir -p src/hooks
mkdir -p src/components/layout
mkdir -p src/components/shared
mkdir -p src/pages/auth
mkdir -p src/pages/seller
mkdir -p src/pages/customer
```

---

## Step 6 — Create db.json (Your Database)

Create a file called `db.json` at the **root** of your project (same level as `package.json`):

```json
{
  "users": [
    {
      "id": "1",
      "name": "Ramesh Kumar",
      "email": "seller@test.com",
      "password": "password123",
      "role": "SELLER",
      "shopName": "Ramesh Fresh Store"
    },
    {
      "id": "2",
      "name": "Priya Singh",
      "email": "customer@test.com",
      "password": "password123",
      "role": "CUSTOMER",
      "shopName": null
    }
  ],
  "products": [
    {
      "id": "1",
      "name": "Basmati Rice 1kg",
      "description": "Premium quality aged basmati rice",
      "price": 120,
      "category": "Grains",
      "stock": 50,
      "imageUrl": "",
      "sellerId": "1",
      "sellerName": "Ramesh Fresh Store",
      "createdAt": "2026-01-01T00:00:00Z"
    },
    {
      "id": "2",
      "name": "Fresh Milk 500ml",
      "description": "Farm-fresh full-fat milk",
      "price": 32,
      "category": "Dairy",
      "stock": 30,
      "imageUrl": "",
      "sellerId": "1",
      "sellerName": "Ramesh Fresh Store",
      "createdAt": "2026-01-01T00:00:00Z"
    }
  ],
  "orders": [],
  "reviews": []
}
```

> **What is this?** This JSON file IS your database. json-server reads this file and gives you a full API. When you create, update, or delete something via your React app, json-server writes the changes directly into this file.

---

## Step 7 — Update package.json Scripts

Open `package.json` and update the `"scripts"` section:

```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "server": "json-server db.json --port 3001"
}
```

The `"server"` script starts json-server on port 3001.

---

## Step 8 — Clean Up Default Files

Delete the default Vite files you don't need:

```bash
rm src/assets/react.svg
rm public/vite.svg
rm src/App.css
```

Open `src/App.jsx` and replace everything with this placeholder (you'll fill it in later):

```jsx
// src/App.jsx
export default function App() {
  return <div>App is working</div>
}
```

Open `src/main.jsx` and make sure it looks like this:

```jsx
// src/main.jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

---

## Step 9 — Verify Everything Runs

Open **two terminal windows** in your project folder:

**Terminal 1** — Start React:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) — you should see "App is working".

**Terminal 2** — Start json-server:
```bash
npm run server
```
Open [http://localhost:3001/products](http://localhost:3001/products) — you should see the sample products as JSON.

> **You will always need both terminals running.** Every time you work on this project, open two terminals. One for React, one for json-server.

Try these URLs in your browser to confirm json-server works:
- `http://localhost:3001/users` → list of users
- `http://localhost:3001/products` → list of products
- `http://localhost:3001/orders` → empty array (no orders yet)

---

## What json-server Gives You For Free

When you run json-server with your `db.json`, you automatically get these API endpoints:

| Action | HTTP Method | URL | What it does |
|--------|-------------|-----|-------------|
| Get all products | GET | `/products` | Returns all products |
| Get one product | GET | `/products/1` | Returns product with id "1" |
| Filter products | GET | `/products?sellerId=1` | Returns products where sellerId is "1" |
| Create product | POST | `/products` | Adds a new product |
| Update product | PUT | `/products/1` | Replaces product id "1" |
| Delete product | DELETE | `/products/1` | Removes product id "1" |

The same pattern works for `/users`, `/orders`, and `/reviews`. You did not write any backend code — json-server handles it all.

---

## Security Note (Important to Understand)

In this project, passwords are stored as plain text in `db.json`. **This is for learning only.** In a real app, passwords must be hashed (scrambled) and stored securely. You will learn that in a later course. For now, focus on React concepts.

---

## Checkpoint

Before continuing, make sure:
- [ ] `npm run dev` shows "App is working" at localhost:5173
- [ ] `npm run server` shows json-server running at localhost:3001
- [ ] `localhost:3001/products` shows your two test products
- [ ] All folders in `src/` were created (api, context, hooks, components, pages)

Now proceed to `02-data-and-auth.md`.
