# Student Guide — 02: Data Layer & Authentication

In this section you will build:
1. API utility functions (your `fetch` helpers)
2. `AuthContext` — the logged-in user shared across the whole app
3. `useCart` — cart state saved in localStorage
4. Sign In and Sign Up pages
5. All routing in `App.jsx`
6. The Navbar with sign out

By the end of this document, users will be able to sign up, sign in, and be redirected to their dashboard.

---

## Concept: fetch() vs axios

You may have heard of axios. `fetch()` is the built-in browser version — no installation needed.

```js
// The same request written two ways:

// With axios
const response = await axios.get('http://localhost:3001/products')
const data = response.data

// With fetch (built-in)
const response = await fetch('http://localhost:3001/products')
const data = await response.json()
```

They do the same thing. `fetch` just needs one extra step: calling `.json()` to read the response.

---

## Concept: Context API

You know how to pass data from parent to child with props. But what if you need the same data (like who is logged in) in 10 different components scattered across the app?

You'd have to pass it through every component in between — this is called "prop drilling" and it gets messy fast.

**Context** solves this. You wrap your whole app once, put data in the Context, and any component anywhere in the app can read it directly — no prop passing needed.

Think of it like a global bulletin board: any component can post to it or read from it.

---

## Step 1 — Base API Helper

Create `src/api/index.js`:

```js
// src/api/index.js
const BASE_URL = 'http://localhost:3001'

// This is a simple helper so you don't repeat the URL and headers everywhere

export const api = {
  // GET — read data
  get: async (path) => {
    const response = await fetch(`${BASE_URL}${path}`)
    if (!response.ok) throw new Error(`GET ${path} failed`)
    return response.json()
  },

  // POST — create new data
  post: async (path, body) => {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!response.ok) throw new Error(`POST ${path} failed`)
    return response.json()
  },

  // PUT — update existing data (replaces the whole object)
  put: async (path, body) => {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!response.ok) throw new Error(`PUT ${path} failed`)
    return response.json()
  },

  // PATCH — update part of existing data
  patch: async (path, body) => {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!response.ok) throw new Error(`PATCH ${path} failed`)
    return response.json()
  },

  // DELETE — remove data
  delete: async (path) => {
    const response = await fetch(`${BASE_URL}${path}`, { method: 'DELETE' })
    if (!response.ok) throw new Error(`DELETE ${path} failed`)
  },
}
```

---

## Step 2 — Users API

Create `src/api/users.js`:

```js
// src/api/users.js
import { api } from './index'

// Find a user by email (for sign in)
export async function findUserByEmail(email) {
  const users = await api.get(`/users?email=${encodeURIComponent(email)}`)
  return users[0] || null  // json-server returns an array, we want the first match
}

// Create a new user (for sign up)
export async function createUser(userData) {
  return api.post('/users', userData)
}
```

---

## Step 3 — Products API

Create `src/api/products.js`:

```js
// src/api/products.js
import { api } from './index'

// Get all products (for customer browsing)
export async function getAllProducts() {
  return api.get('/products?_sort=createdAt&_order=desc')
}

// Get only this seller's products
export async function getProductsBySeller(sellerId) {
  return api.get(`/products?sellerId=${sellerId}&_sort=createdAt&_order=desc`)
}

// Get a single product by ID (for product detail page)
export async function getProductById(id) {
  return api.get(`/products/${id}`)
}

// Create a new product
export async function createProduct(data) {
  return api.post('/products', {
    ...data,
    createdAt: new Date().toISOString(),
  })
}

// Update a product (stock, price, name, etc.)
export async function updateProduct(id, data) {
  return api.patch(`/products/${id}`, data)
}

// Delete a product
export async function deleteProduct(id) {
  return api.delete(`/products/${id}`)
}
```

---

## Step 4 — Orders API

Create `src/api/orders.js`:

```js
// src/api/orders.js
import { api } from './index'

// Get all orders for a customer
export async function getOrdersByCustomer(customerId) {
  return api.get(`/orders?customerId=${customerId}&_sort=createdAt&_order=desc`)
}

// Get all orders for a seller
export async function getOrdersBySeller(sellerId) {
  return api.get(`/orders?sellerId=${sellerId}&_sort=createdAt&_order=desc`)
}

// Get a single order
export async function getOrderById(id) {
  return api.get(`/orders/${id}`)
}

// Create a new order (called at checkout)
export async function createOrder(data) {
  return api.post('/orders', {
    ...data,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
  })
}

// Update order status (seller updates this)
export async function updateOrderStatus(id, status) {
  return api.patch(`/orders/${id}`, { status })
}
```

---

## Step 5 — Reviews API

Create `src/api/reviews.js`:

```js
// src/api/reviews.js
import { api } from './index'

// Get all reviews for a seller (shown on product detail page)
export async function getReviewsBySeller(sellerId) {
  return api.get(`/reviews?sellerId=${sellerId}&_sort=createdAt&_order=desc`)
}

// Check if a review exists for a specific order
export async function getReviewByOrder(orderId) {
  const reviews = await api.get(`/reviews?orderId=${orderId}`)
  return reviews[0] || null
}

// Submit a new review
export async function createReview(data) {
  return api.post('/reviews', {
    ...data,
    createdAt: new Date().toISOString(),
  })
}
```

---

## Step 6 — AuthContext

Now you'll build the Context that shares the logged-in user across all components.

Create `src/context/AuthContext.jsx`:

```jsx
// src/context/AuthContext.jsx
import { createContext, useContext, useState } from 'react'

// Step 1: Create the Context (think of it as creating the bulletin board)
const AuthContext = createContext(null)

// Step 2: Create the Provider component
// This wraps your entire app and makes the user data available everywhere
export function AuthProvider({ children }) {

  // Initialize user from localStorage so they stay logged in on refresh
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('currentUser')
    return saved ? JSON.parse(saved) : null
  })

  // Called when user signs in — saves to state AND localStorage
  function login(userData) {
    localStorage.setItem('currentUser', JSON.stringify(userData))
    setUser(userData)
  }

  // Called when user signs out — clears everything
  function logout() {
    localStorage.removeItem('currentUser')
    setUser(null)
  }

  return (
    // Step 3: Make user, login, and logout available to all child components
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// Step 4: Create a custom hook so components can easily access the context
// Instead of writing useContext(AuthContext) every time, you just write useAuth()
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}
```

---

## Step 7 — Cart Hook

The cart is saved in `localStorage` — no API call needed for cart operations.

Create `src/hooks/useCart.js`:

```js
// src/hooks/useCart.js
import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'

// This hook manages the cart for the currently logged-in customer
// Each customer has their own cart saved separately in localStorage
export function useCart() {
  const { user } = useAuth()

  // Use the user's ID as part of the localStorage key
  // So cart_1 is user 1's cart, cart_2 is user 2's cart, etc.
  const cartKey = user ? `cart_${user.id}` : 'cart_guest'

  const [cartItems, setCartItems] = useState(() => {
    const saved = localStorage.getItem(cartKey)
    return saved ? JSON.parse(saved) : []
  })

  // Every time cartItems changes, save to localStorage automatically
  useEffect(() => {
    localStorage.setItem(cartKey, JSON.stringify(cartItems))
  }, [cartItems, cartKey])

  // Add a product to cart (or increase quantity if already there)
  function addToCart(product, quantity = 1) {
    setCartItems(prev => {
      const existing = prev.find(item => item.productId === product.id)

      if (existing) {
        // Product already in cart — just increase quantity
        return prev.map(item =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        )
      }

      // New product — add to cart
      return [
        ...prev,
        {
          id: Date.now().toString(),
          productId: product.id,
          productName: product.name,
          price: product.price,
          quantity,
          stock: product.stock,
          sellerId: product.sellerId,
          sellerName: product.sellerName,
        },
      ]
    })
  }

  // Change quantity of a specific item
  function updateQuantity(productId, newQuantity) {
    if (newQuantity <= 0) {
      removeFromCart(productId)
      return
    }
    setCartItems(prev =>
      prev.map(item =>
        item.productId === productId ? { ...item, quantity: newQuantity } : item
      )
    )
  }

  // Remove a specific item
  function removeFromCart(productId) {
    setCartItems(prev => prev.filter(item => item.productId !== productId))
  }

  // Empty the cart (called after checkout)
  function clearCart() {
    setCartItems([])
  }

  // Calculate grand total
  const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

  // Count total items (for badge on cart icon)
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)

  return {
    cartItems,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    total,
    itemCount,
  }
}
```

---

## Step 8 — ProtectedRoute Component

This component protects pages that require login. If a user tries to visit `/seller/products` without being logged in, it redirects them to the sign-in page.

Create `src/components/layout/ProtectedRoute.jsx`:

```jsx
// src/components/layout/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

// requiredRole: pass "SELLER" or "CUSTOMER" to also check the role
// If not passed, just checks that the user is logged in
export function ProtectedRoute({ children, requiredRole }) {
  const { user } = useAuth()

  // Not logged in at all → go to sign in
  if (!user) {
    return <Navigate to="/signin" replace />
  }

  // Logged in but wrong role (e.g., customer tries to visit seller page)
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/unauthorized" replace />
  }

  // All good — render the page
  return children
}
```

---

## Step 9 — Shared Components

### StatusBadge

Create `src/components/shared/StatusBadge.jsx`:

```jsx
// src/components/shared/StatusBadge.jsx
import { Badge } from '@/components/ui/badge'

const STATUS_STYLES = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  DISPATCHED: 'bg-purple-100 text-purple-800',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
}

export function StatusBadge({ status }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  )
}
```

### StarRating

Create `src/components/shared/StarRating.jsx`:

```jsx
// src/components/shared/StarRating.jsx

// Display-only star rating (shows filled vs empty stars)
export function StarDisplay({ rating, max = 5 }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={i < rating ? 'text-yellow-400' : 'text-gray-300'}>
          ★
        </span>
      ))}
    </div>
  )
}

// Interactive star picker (for submitting reviews)
export function StarPicker({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className={`text-2xl transition-colors ${
            star <= value ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-300'
          }`}
        >
          ★
        </button>
      ))}
    </div>
  )
}
```

---

## Step 10 — Navbar

Create `src/components/layout/Navbar.jsx`:

```jsx
// src/components/layout/Navbar.jsx
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useCart } from '@/hooks/useCart'
import { Button } from '@/components/ui/button'

export function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  // Only load cart for customers
  const cart = user?.role === 'CUSTOMER' ? useCart() : null

  function handleLogout() {
    logout()
    navigate('/signin')
  }

  return (
    <header className="border-b bg-white sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="font-bold text-lg text-green-700">
          🛒 GroceryMart
        </Link>

        <nav className="flex items-center gap-4">
          {/* Seller navigation */}
          {user?.role === 'SELLER' && (
            <>
              <Link to="/seller" className="text-sm hover:text-green-700 transition-colors">
                Dashboard
              </Link>
              <Link to="/seller/products" className="text-sm hover:text-green-700 transition-colors">
                Products
              </Link>
              <Link to="/seller/orders" className="text-sm hover:text-green-700 transition-colors">
                Orders
              </Link>
            </>
          )}

          {/* Customer navigation */}
          {user?.role === 'CUSTOMER' && (
            <>
              <Link to="/customer" className="text-sm hover:text-green-700 transition-colors">
                Browse
              </Link>
              <Link to="/customer/cart" className="text-sm hover:text-green-700 transition-colors relative">
                Cart
                {cart?.itemCount > 0 && (
                  <span className="absolute -top-2 -right-3 bg-green-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    {cart.itemCount}
                  </span>
                )}
              </Link>
              <Link to="/customer/orders" className="text-sm hover:text-green-700 transition-colors">
                My Orders
              </Link>
            </>
          )}

          {/* Auth buttons */}
          {user ? (
            <div className="flex items-center gap-3 ml-2">
              <span className="text-sm text-gray-500">{user.name}</span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Sign Out
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link to="/signin">Sign In</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/signup">Sign Up</Link>
              </Button>
            </div>
          )}
        </nav>
      </div>
    </header>
  )
}
```

> **Note about the cart in Navbar:** The `useCart()` hook is only called when user is a CUSTOMER. React hooks must be called in the same order every render — calling hooks conditionally (inside an `if`) would break this rule. The approach above (calling `useCart()` and storing in a variable, then checking later) is a workaround for this demo. In a real app, you'd use a CartContext similarly to AuthContext.

---

## Step 11 — Sign Up Page

Create `src/pages/auth/SignUp.jsx`:

```jsx
// src/pages/auth/SignUp.jsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { createUser, findUserByEmail } from '@/api/users'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function SignUp() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [role, setRole] = useState('CUSTOMER')  // or 'SELLER'
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    shopName: '',
  })

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    if (role === 'SELLER' && !form.shopName.trim()) {
      toast.error('Shop name is required for sellers')
      return
    }

    setLoading(true)

    try {
      // Check if email already exists
      const existing = await findUserByEmail(form.email)
      if (existing) {
        toast.error('An account with this email already exists')
        setLoading(false)
        return
      }

      // Create the user
      const newUser = await createUser({
        name: form.name.trim(),
        email: form.email.toLowerCase().trim(),
        password: form.password,
        role,
        shopName: role === 'SELLER' ? form.shopName.trim() : null,
      })

      // Log them in immediately
      login(newUser)
      toast.success('Account created!')

      // Redirect based on role
      navigate(role === 'SELLER' ? '/seller' : '/customer')

    } catch (err) {
      toast.error('Sign up failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create an Account</CardTitle>
          <CardDescription>Join GroceryMart today</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Role Selector */}
          <div className="grid grid-cols-2 gap-2 mb-6">
            <button
              type="button"
              onClick={() => setRole('CUSTOMER')}
              className={`py-2 px-4 rounded-lg border text-sm font-medium transition-colors ${
                role === 'CUSTOMER'
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-green-400'
              }`}
            >
              I am a Customer
            </button>
            <button
              type="button"
              onClick={() => setRole('SELLER')}
              className={`py-2 px-4 rounded-lg border text-sm font-medium transition-colors ${
                role === 'SELLER'
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-green-400'
              }`}
            >
              I am a Seller
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Full Name</label>
              <Input name="name" required placeholder="Your full name" value={form.name} onChange={handleChange} />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Email</label>
              <Input name="email" type="email" required placeholder="you@example.com" value={form.email} onChange={handleChange} />
            </div>

            {/* Only show shop name for sellers */}
            {role === 'SELLER' && (
              <div className="space-y-1">
                <label className="text-sm font-medium">Shop Name</label>
                <Input name="shopName" required placeholder="e.g. Sharma Fresh Vegetables" value={form.shopName} onChange={handleChange} />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-sm font-medium">Password</label>
              <Input name="password" type="password" required placeholder="Minimum 6 characters" value={form.password} onChange={handleChange} />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Confirm Password</label>
              <Input name="confirmPassword" type="password" required placeholder="Repeat password" value={form.confirmPassword} onChange={handleChange} />
            </div>

            <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>

          <p className="text-sm text-center text-gray-500 mt-4">
            Already have an account?{' '}
            <Link to="/signin" className="text-green-700 underline">Sign in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
```

---

## Step 12 — Sign In Page

Create `src/pages/auth/SignIn.jsx`:

```jsx
// src/pages/auth/SignIn.jsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { findUserByEmail } from '@/api/users'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function SignIn() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)

    try {
      // Find user by email
      const user = await findUserByEmail(email.toLowerCase().trim())

      // Check if user exists and password matches
      if (!user || user.password !== password) {
        toast.error('Invalid email or password')
        setLoading(false)
        return
      }

      // Save to context and localStorage
      login(user)
      toast.success(`Welcome back, ${user.name}!`)

      // Redirect to the correct dashboard
      navigate(user.role === 'SELLER' ? '/seller' : '/customer')

    } catch (err) {
      toast.error('Something went wrong. Make sure json-server is running.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Welcome Back</CardTitle>
          <CardDescription>Sign in to GroceryMart</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Test accounts hint for development */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-xs text-blue-700 mb-4">
            <p className="font-semibold">Test Accounts:</p>
            <p>Seller: seller@test.com / password123</p>
            <p>Customer: customer@test.com / password123</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Email</label>
              <Input type="email" required placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Password</label>
              <Input type="password" required placeholder="Your password" value={password} onChange={e => setPassword(e.target.value)} />
            </div>

            <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <p className="text-sm text-center text-gray-500 mt-4">
            New here?{' '}
            <Link to="/signup" className="text-green-700 underline">Create an account</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
```

---

## Step 13 — Wire Up App.jsx With All Routes

Now connect everything together in `App.jsx`:

```jsx
// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/context/AuthContext'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { Navbar } from '@/components/layout/Navbar'

// Auth pages
import SignIn from '@/pages/auth/SignIn'
import SignUp from '@/pages/auth/SignUp'

// Seller pages (you'll create these in 03-seller.md)
import SellerDashboard from '@/pages/seller/Dashboard'
import SellerProducts from '@/pages/seller/Products'
import SellerOrders from '@/pages/seller/Orders'

// Customer pages (you'll create these in 04-customer.md)
import CustomerBrowse from '@/pages/customer/Browse'
import ProductDetail from '@/pages/customer/ProductDetail'
import Cart from '@/pages/customer/Cart'
import Checkout from '@/pages/customer/Checkout'
import CustomerOrders from '@/pages/customer/Orders'
import OrderDetail from '@/pages/customer/OrderDetail'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50">
          <Navbar />

          <Routes>
            {/* Default → sign in */}
            <Route path="/" element={<Navigate to="/signin" replace />} />

            {/* Public routes */}
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />

            {/* Seller routes — only SELLER role can access */}
            <Route
              path="/seller"
              element={
                <ProtectedRoute requiredRole="SELLER">
                  <SellerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/seller/products"
              element={
                <ProtectedRoute requiredRole="SELLER">
                  <SellerProducts />
                </ProtectedRoute>
              }
            />
            <Route
              path="/seller/orders"
              element={
                <ProtectedRoute requiredRole="SELLER">
                  <SellerOrders />
                </ProtectedRoute>
              }
            />

            {/* Customer routes — only CUSTOMER role can access */}
            <Route
              path="/customer"
              element={
                <ProtectedRoute requiredRole="CUSTOMER">
                  <CustomerBrowse />
                </ProtectedRoute>
              }
            />
            <Route
              path="/customer/product/:id"
              element={
                <ProtectedRoute requiredRole="CUSTOMER">
                  <ProductDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/customer/cart"
              element={
                <ProtectedRoute requiredRole="CUSTOMER">
                  <Cart />
                </ProtectedRoute>
              }
            />
            <Route
              path="/customer/checkout"
              element={
                <ProtectedRoute requiredRole="CUSTOMER">
                  <Checkout />
                </ProtectedRoute>
              }
            />
            <Route
              path="/customer/orders"
              element={
                <ProtectedRoute requiredRole="CUSTOMER">
                  <CustomerOrders />
                </ProtectedRoute>
              }
            />
            <Route
              path="/customer/orders/:id"
              element={
                <ProtectedRoute requiredRole="CUSTOMER">
                  <OrderDetail />
                </ProtectedRoute>
              }
            />

            {/* Catch-all */}
            <Route path="/unauthorized" element={<div className="p-8 text-center"><h1 className="text-2xl font-bold">Access Denied</h1></div>} />
            <Route path="*" element={<div className="p-8 text-center"><h1 className="text-2xl font-bold">Page Not Found</h1></div>} />
          </Routes>
        </div>
        <Toaster richColors position="top-right" />
      </BrowserRouter>
    </AuthProvider>
  )
}
```

> **Note:** The pages for seller and customer don't exist yet — you'll create them in the next documents. Your app will show errors until you create them.

---

## Step 14 — Install Sonner (Toast Notifications)

You used `toast` from `sonner` in the sign in/sign up pages. Install it:

```bash
npm install sonner
```

---

## Step 15 — Create Placeholder Pages

Until you build the real pages, create placeholder files so the app doesn't crash:

```bash
# Seller placeholders
echo "export default function SellerDashboard() { return <div className='p-8'><h1>Seller Dashboard</h1></div> }" > src/pages/seller/Dashboard.jsx
echo "export default function SellerProducts() { return <div className='p-8'><h1>Seller Products</h1></div> }" > src/pages/seller/Products.jsx
echo "export default function SellerOrders() { return <div className='p-8'><h1>Seller Orders</h1></div> }" > src/pages/seller/Orders.jsx

# Customer placeholders
echo "export default function CustomerBrowse() { return <div className='p-8'><h1>Browse Products</h1></div> }" > src/pages/customer/Browse.jsx
echo "export default function ProductDetail() { return <div className='p-8'><h1>Product Detail</h1></div> }" > src/pages/customer/ProductDetail.jsx
echo "export default function Cart() { return <div className='p-8'><h1>Cart</h1></div> }" > src/pages/customer/Cart.jsx
echo "export default function Checkout() { return <div className='p-8'><h1>Checkout</h1></div> }" > src/pages/customer/Checkout.jsx
echo "export default function CustomerOrders() { return <div className='p-8'><h1>My Orders</h1></div> }" > src/pages/customer/Orders.jsx
echo "export default function OrderDetail() { return <div className='p-8'><h1>Order Detail</h1></div> }" > src/pages/customer/OrderDetail.jsx
```

---

## Test This Checkpoint

1. Make sure both terminals are running (`npm run dev` + `npm run server`)
2. Open `http://localhost:5173`
3. You should be redirected to `/signin`
4. Sign in with `seller@test.com / password123` → should go to `/seller` and show "Seller Dashboard"
5. Click Sign Out → should go back to `/signin`
6. Sign in with `customer@test.com / password123` → should go to `/customer`
7. Try visiting `/seller` while logged in as a customer → should redirect to `/unauthorized`

Once this works, proceed to `03-seller.md`.
