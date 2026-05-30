# Student Guide — 04: Customer Pages

In this section you will replace the placeholder customer pages with real, working ones.

Customer features:
- **Browse** — see all products, search, filter by category
- **Product Detail** — full product info, seller info, reviews, add to cart
- **Cart** — manage cart items, see total
- **Checkout** — enter address, place order (one order per seller)
- **Orders** — see all their orders and current status
- **Order Detail** — full order info + leave a review after delivery

---

## Step 1 — Browse Page

This is the first page customers see after logging in. It shows all products from all sellers.

Replace `src/pages/customer/Browse.jsx`:

```jsx
// src/pages/customer/Browse.jsx
import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getAllProducts } from '@/api/products'
import { useCart } from '@/hooks/useCart'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'

const CATEGORIES = ['All', 'Grains', 'Dairy', 'Vegetables', 'Fruits', 'Meat & Fish', 'Beverages', 'Snacks', 'Bakery', 'Other']

export default function Browse() {
  const { addToCart } = useCart()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')

  useEffect(() => {
    getAllProducts()
      .then(setProducts)
      .catch(() => toast.error('Failed to load products'))
      .finally(() => setLoading(false))
  }, [])

  // Filter products based on search text and selected category
  // useMemo re-calculates this only when products, search, or selectedCategory changes
  const filtered = useMemo(() => {
    return products.filter(product => {
      const matchesSearch =
        product.name.toLowerCase().includes(search.toLowerCase()) ||
        product.sellerName.toLowerCase().includes(search.toLowerCase())

      const matchesCategory =
        selectedCategory === 'All' || product.category === selectedCategory

      return matchesSearch && matchesCategory
    })
  }, [products, search, selectedCategory])

  function handleAddToCart(product) {
    if (product.stock === 0) {
      toast.error('This product is out of stock')
      return
    }
    addToCart(product, 1)
    toast.success(`${product.name} added to cart`)
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Loading products...</div>

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Browse Groceries</h1>
        <p className="text-gray-500 text-sm">{products.length} products from local sellers</p>
      </div>

      {/* Search box */}
      <Input
        placeholder="Search products or sellers..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="max-w-md"
      />

      {/* Category filters */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
              selectedCategory === cat
                ? 'bg-green-600 text-white border-green-600'
                : 'bg-white text-gray-700 border-gray-300 hover:border-green-400'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Products grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">
            {search ? `No products found for "${search}".` : 'No products available.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map(product => (
            <Card key={product.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-0">
                {/* Product image */}
                <Link to={`/customer/product/${product.id}`}>
                  <div className="aspect-square bg-gray-100 rounded-t-lg overflow-hidden">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl">
                        🥬
                      </div>
                    )}
                  </div>
                </Link>

                {/* Product info */}
                <div className="p-3 space-y-2">
                  <Link to={`/customer/product/${product.id}`}>
                    <p className="font-medium text-sm leading-tight hover:text-green-700 transition-colors">
                      {product.name}
                    </p>
                  </Link>

                  <p className="text-xs text-gray-500">{product.sellerName}</p>

                  <Badge variant="secondary" className="text-xs">{product.category}</Badge>

                  <div className="flex items-center justify-between pt-1">
                    <span className="font-bold text-green-700">₹{product.price}</span>
                    {product.stock === 0 ? (
                      <span className="text-xs text-red-500 font-medium">Out of stock</span>
                    ) : (
                      <Button
                        size="sm"
                        className="h-7 text-xs bg-green-600 hover:bg-green-700"
                        onClick={() => handleAddToCart(product)}
                      >
                        + Add
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
```

---

## Step 2 — Product Detail Page

Shows full product information, customer reviews, and lets the user add to cart with a specific quantity.

Replace `src/pages/customer/ProductDetail.jsx`:

```jsx
// src/pages/customer/ProductDetail.jsx
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getProductById } from '@/api/products'
import { getReviewsBySeller } from '@/api/reviews'
import { useCart } from '@/hooks/useCart'
import { StarDisplay } from '@/components/shared/StarRating'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

export default function ProductDetail() {
  const { id } = useParams()         // Gets the product ID from the URL (/customer/product/:id)
  const navigate = useNavigate()
  const { addToCart } = useCart()

  const [product, setProduct] = useState(null)
  const [reviews, setReviews] = useState([])
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const p = await getProductById(id)
        setProduct(p)
        const r = await getReviewsBySeller(p.sellerId)
        setReviews(r)
      } catch {
        toast.error('Product not found')
        navigate('/customer')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  function handleAddToCart() {
    addToCart(product, quantity)
    toast.success(`${product.name} (×${quantity}) added to cart`)
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>
  if (!product) return null

  const avgRating = reviews.length
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Back button */}
      <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-gray-700">
        ← Back
      </button>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Product image */}
        <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl">🥬</div>
          )}
        </div>

        {/* Product info */}
        <div className="space-y-4">
          <div>
            <Badge variant="secondary">{product.category}</Badge>
            <h1 className="text-2xl font-bold mt-2">{product.name}</h1>
            <p className="text-gray-500 text-sm">Sold by {product.sellerName}</p>
          </div>

          <p className="text-3xl font-bold text-green-700">₹{product.price}</p>

          {product.description && (
            <p className="text-gray-600 text-sm">{product.description}</p>
          )}

          {/* Rating summary */}
          {avgRating && (
            <div className="flex items-center gap-2">
              <StarDisplay rating={Math.round(avgRating)} />
              <span className="text-sm text-gray-500">{avgRating} ({reviews.length} reviews)</span>
            </div>
          )}

          {/* Stock */}
          <p className={`text-sm font-medium ${product.stock === 0 ? 'text-red-600' : 'text-gray-600'}`}>
            {product.stock === 0 ? 'Out of stock' : `${product.stock} available`}
          </p>

          {/* Quantity selector + Add to cart */}
          {product.stock > 0 && (
            <div className="flex items-center gap-3">
              <div className="flex items-center border rounded-md">
                <button
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  className="px-3 py-2 text-lg font-medium hover:bg-gray-100 transition-colors"
                >
                  −
                </button>
                <span className="px-4 py-2 font-medium">{quantity}</span>
                <button
                  onClick={() => setQuantity(q => Math.min(product.stock, q + 1))}
                  className="px-3 py-2 text-lg font-medium hover:bg-gray-100 transition-colors"
                >
                  +
                </button>
              </div>

              <Button
                onClick={handleAddToCart}
                className="bg-green-600 hover:bg-green-700 flex-1"
              >
                Add to Cart — ₹{product.price * quantity}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Reviews section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Customer Reviews ({reviews.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reviews.length === 0 ? (
            <p className="text-gray-500 text-sm">No reviews yet for this seller's products.</p>
          ) : (
            <div className="space-y-4">
              {reviews.map(review => (
                <div key={review.id} className="border-b last:border-0 pb-4 last:pb-0">
                  <div className="flex items-center gap-2 mb-1">
                    <StarDisplay rating={review.rating} />
                    <span className="font-medium text-sm">{review.customerName}</span>
                  </div>
                  {review.comment && <p className="text-sm text-gray-600">{review.comment}</p>}
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(review.createdAt).toLocaleDateString('en-IN')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

---

## Step 3 — Cart Page

Replace `src/pages/customer/Cart.jsx`:

```jsx
// src/pages/customer/Cart.jsx
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '@/hooks/useCart'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function Cart() {
  const navigate = useNavigate()
  const { cartItems, updateQuantity, removeFromCart, total } = useCart()

  if (cartItems.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center py-16">
        <p className="text-4xl mb-4">🛒</p>
        <h1 className="text-2xl font-bold mb-2">Your cart is empty</h1>
        <p className="text-gray-500 mb-6">Add some products to get started.</p>
        <Button asChild className="bg-green-600 hover:bg-green-700">
          <Link to="/customer">Browse Products</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Your Cart ({cartItems.length} items)</h1>

      {/* Cart items */}
      <div className="space-y-3">
        {cartItems.map(item => (
          <Card key={item.id}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-medium">{item.productName}</p>
                <p className="text-sm text-gray-500">{item.sellerName}</p>
                <p className="text-green-700 font-medium">₹{item.price} each</p>
              </div>

              {/* Quantity stepper */}
              <div className="flex items-center border rounded-md">
                <button
                  onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                  className="px-3 py-1.5 hover:bg-gray-100 transition-colors"
                >
                  −
                </button>
                <span className="px-4 py-1.5 font-medium min-w-[2rem] text-center">
                  {item.quantity}
                </span>
                <button
                  onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                  className="px-3 py-1.5 hover:bg-gray-100 transition-colors"
                  disabled={item.quantity >= item.stock}
                >
                  +
                </button>
              </div>

              {/* Subtotal */}
              <p className="font-bold w-20 text-right">₹{item.price * item.quantity}</p>

              {/* Remove */}
              <button
                onClick={() => removeFromCart(item.productId)}
                className="text-gray-400 hover:text-red-500 transition-colors ml-2"
                title="Remove"
              >
                ✕
              </button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Cart summary */}
      <div className="border-t pt-4 flex justify-between items-center">
        <div>
          <p className="text-gray-500 text-sm">Grand Total</p>
          <p className="text-2xl font-bold text-green-700">₹{total}</p>
        </div>
        <Button
          onClick={() => navigate('/customer/checkout')}
          size="lg"
          className="bg-green-600 hover:bg-green-700"
        >
          Proceed to Checkout →
        </Button>
      </div>
    </div>
  )
}
```

---

## Step 4 — Checkout Page

This is the most important customer action. The checkout:
1. Shows cart items grouped by seller
2. Asks for a delivery address
3. Creates **one order per seller** (same as the PRD design principle)
4. Clears the cart and redirects to orders

Replace `src/pages/customer/Checkout.jsx`:

```jsx
// src/pages/customer/Checkout.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useCart } from '@/hooks/useCart'
import { createOrder } from '@/api/orders'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

export default function Checkout() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { cartItems, total, clearCart } = useCart()
  const [loading, setLoading] = useState(false)

  const [address, setAddress] = useState({
    name: user.name,
    phone: '',
    street: '',
    city: '',
    state: '',
    pincode: '',
  })

  function handleAddressChange(e) {
    setAddress(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  // Group cart items by seller — one order will be created per seller
  function groupBySeller(items) {
    const groups = {}
    items.forEach(item => {
      if (!groups[item.sellerId]) {
        groups[item.sellerId] = {
          sellerId: item.sellerId,
          sellerName: item.sellerName,
          items: [],
          total: 0,
        }
      }
      groups[item.sellerId].items.push(item)
      groups[item.sellerId].total += item.price * item.quantity
    })
    return Object.values(groups)
  }

  const sellerGroups = groupBySeller(cartItems)

  async function handlePlaceOrder(e) {
    e.preventDefault()

    const fullAddress = `${address.name}, ${address.phone}\n${address.street}, ${address.city}, ${address.state} - ${address.pincode}`

    setLoading(true)

    try {
      // Create one order for each seller group
      // Promise.all runs all order creations at the same time (in parallel)
      const orderPromises = sellerGroups.map(group =>
        createOrder({
          customerId: user.id,
          customerName: user.name,
          sellerId: group.sellerId,
          sellerName: group.sellerName,
          items: group.items.map(item => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            price: item.price,
          })),
          totalAmount: group.total,
          address: fullAddress,
        })
      )

      await Promise.all(orderPromises)

      // Clear cart after successful checkout
      clearCart()

      toast.success(
        sellerGroups.length > 1
          ? `${sellerGroups.length} orders placed successfully!`
          : 'Order placed successfully!'
      )

      navigate('/customer/orders')

    } catch (err) {
      toast.error('Order placement failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (cartItems.length === 0) {
    navigate('/customer/cart')
    return null
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Checkout</h1>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Left — delivery address form */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Delivery Address</CardTitle>
            </CardHeader>
            <CardContent>
              <form id="checkout-form" onSubmit={handlePlaceOrder} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Full Name</label>
                  <Input name="name" required value={address.name} onChange={handleAddressChange} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Phone Number</label>
                  <Input name="phone" type="tel" required placeholder="+91 98765 43210" value={address.phone} onChange={handleAddressChange} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Street Address</label>
                  <Textarea name="street" required placeholder="House no., Street, Area" rows={2} value={address.street} onChange={handleAddressChange} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">City</label>
                    <Input name="city" required placeholder="Mumbai" value={address.city} onChange={handleAddressChange} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">State</label>
                    <Input name="state" required placeholder="Maharashtra" value={address.state} onChange={handleAddressChange} />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Pincode</label>
                  <Input name="pincode" required placeholder="400001" value={address.pincode} onChange={handleAddressChange} />
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right — order summary */}
        <div className="space-y-4">
          {/* Show items grouped by seller */}
          {sellerGroups.map(group => (
            <Card key={group.sellerId}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Order from {group.sellerName}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {group.items.map(item => (
                    <div key={item.productId} className="flex justify-between text-sm">
                      <span>{item.productName} × {item.quantity}</span>
                      <span className="font-medium">₹{item.price * item.quantity}</span>
                    </div>
                  ))}
                  <div className="border-t pt-2 flex justify-between text-sm font-semibold">
                    <span>Subtotal</span>
                    <span>₹{group.total}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Grand total + payment info */}
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold">Grand Total</span>
                <span className="text-xl font-bold text-green-700">₹{total}</span>
              </div>
              <p className="text-xs text-gray-500">Payment: Cash on Delivery</p>
              {sellerGroups.length > 1 && (
                <p className="text-xs text-blue-600 mt-1">
                  ℹ️ {sellerGroups.length} separate orders will be created (one per seller)
                </p>
              )}
            </CardContent>
          </Card>

          <Button
            type="submit"
            form="checkout-form"
            size="lg"
            className="w-full bg-green-600 hover:bg-green-700"
            disabled={loading}
          >
            {loading ? 'Placing Order...' : `Place Order${sellerGroups.length > 1 ? 's' : ''} — ₹${total}`}
          </Button>
        </div>
      </div>
    </div>
  )
}
```

---

## Step 5 — Customer Orders Page

Replace `src/pages/customer/Orders.jsx`:

```jsx
// src/pages/customer/Orders.jsx
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { getOrdersByCustomer } from '@/api/orders'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

const TABS = ['All', 'Active', 'Delivered']

export default function CustomerOrders() {
  const { user } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('All')

  useEffect(() => {
    getOrdersByCustomer(user.id)
      .then(setOrders)
      .catch(() => toast.error('Failed to load orders'))
      .finally(() => setLoading(false))
  }, [user.id])

  const filtered = orders.filter(order => {
    if (activeTab === 'All') return true
    if (activeTab === 'Active') return !['DELIVERED', 'CANCELLED'].includes(order.status)
    if (activeTab === 'Delivered') return order.status === 'DELIVERED'
    return true
  })

  if (loading) return <div className="p-8 text-center text-gray-500">Loading orders...</div>

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-5">
      <h1 className="text-2xl font-bold">My Orders</h1>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-green-600 text-green-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-4">📦</p>
          <p className="text-gray-500 mb-4">You haven't placed any orders yet.</p>
          <Button asChild className="bg-green-600 hover:bg-green-700">
            <Link to="/customer">Start Shopping</Link>
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-gray-500 text-center py-8">
          No {activeTab !== 'All' ? activeTab.toLowerCase() : ''} orders.
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map(order => (
            <Link key={order.id} to={`/customer/orders/${order.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-sm">Order #{order.id.slice(-6).toUpperCase()}</p>
                      <p className="text-xs text-gray-500">{order.sellerName}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(order.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })}
                      </p>
                    </div>
                    <div className="text-right space-y-1">
                      <StatusBadge status={order.status} />
                      <p className="text-sm font-bold">₹{order.totalAmount}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {order.items.length} item(s): {order.items.map(i => i.productName).join(', ')}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
```

---

## Step 6 — Order Detail + Review Form

This is the final piece. After an order is DELIVERED, the customer can leave a review.

Replace `src/pages/customer/OrderDetail.jsx`:

```jsx
// src/pages/customer/OrderDetail.jsx
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { getOrderById } from '@/api/orders'
import { getReviewByOrder, createReview } from '@/api/reviews'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { StarPicker, StarDisplay } from '@/components/shared/StarRating'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

// Shows each step in the order journey
const STATUS_STEPS = ['PENDING', 'CONFIRMED', 'DISPATCHED', 'DELIVERED']

function OrderTimeline({ currentStatus }) {
  const currentIndex = STATUS_STEPS.indexOf(currentStatus)

  return (
    <div className="flex items-center gap-0">
      {STATUS_STEPS.map((step, index) => {
        const isCompleted = index <= currentIndex
        const isLast = index === STATUS_STEPS.length - 1

        return (
          <div key={step} className="flex items-center flex-1 last:flex-none">
            {/* Circle */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
              isCompleted ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-400'
            }`}>
              {isCompleted ? '✓' : index + 1}
            </div>

            {/* Label below */}
            <div className="flex flex-col items-center absolute mt-10 ml-[-16px]">
              <span className={`text-xs whitespace-nowrap ${isCompleted ? 'text-green-700 font-medium' : 'text-gray-400'}`}>
                {step}
              </span>
            </div>

            {/* Connector line */}
            {!isLast && (
              <div className={`flex-1 h-0.5 ${index < currentIndex ? 'bg-green-600' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function OrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [order, setOrder] = useState(null)
  const [existingReview, setExistingReview] = useState(null)
  const [loading, setLoading] = useState(true)

  // Review form state
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const o = await getOrderById(id)
        setOrder(o)

        // Check if a review was already submitted for this order
        const review = await getReviewByOrder(id)
        setExistingReview(review)
      } catch {
        toast.error('Order not found')
        navigate('/customer/orders')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  async function handleSubmitReview(e) {
    e.preventDefault()

    if (rating === 0) {
      toast.error('Please select a star rating')
      return
    }

    setSubmittingReview(true)

    try {
      const review = await createReview({
        orderId: id,
        customerId: user.id,
        customerName: user.name,
        sellerId: order.sellerId,
        rating,
        comment: comment.trim(),
      })

      setExistingReview(review)
      toast.success('Review submitted! Thank you.')

    } catch {
      toast.error('Failed to submit review')
    } finally {
      setSubmittingReview(false)
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>
  if (!order) return null

  const canReview = order.status === 'DELIVERED' && !existingReview

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <button onClick={() => navigate('/customer/orders')} className="text-sm text-gray-500 hover:text-gray-700">
        ← Back to Orders
      </button>

      {/* Order header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">Order #{order.id.slice(-6).toUpperCase()}</h1>
          <p className="text-gray-500 text-sm">{order.sellerName}</p>
          <p className="text-gray-400 text-xs mt-0.5">
            Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric', month: 'long', year: 'numeric'
            })}
          </p>
        </div>
        <div className="text-right">
          <StatusBadge status={order.status} />
          <p className="text-xl font-bold mt-1">₹{order.totalAmount}</p>
        </div>
      </div>

      {/* Status timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Order Status</CardTitle>
        </CardHeader>
        <CardContent className="pb-10">
          <OrderTimeline currentStatus={order.status} />
        </CardContent>
      </Card>

      {/* Order items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Items Ordered</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {order.items.map((item, index) => (
              <div key={index} className="flex justify-between py-2 border-b last:border-0">
                <div>
                  <p className="font-medium text-sm">{item.productName}</p>
                  <p className="text-xs text-gray-500">Qty: {item.quantity} × ₹{item.price}</p>
                </div>
                <p className="font-semibold">₹{item.price * item.quantity}</p>
              </div>
            ))}
            <div className="flex justify-between pt-2 font-bold">
              <span>Total</span>
              <span className="text-green-700">₹{order.totalAmount}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delivery address */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Delivery Address</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 whitespace-pre-line">{order.address}</p>
        </CardContent>
      </Card>

      {/* Review section — only shown after delivery */}
      {order.status === 'DELIVERED' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {existingReview ? 'Your Review' : 'Leave a Review'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {existingReview ? (
              // Show submitted review
              <div className="space-y-2">
                <StarDisplay rating={existingReview.rating} />
                {existingReview.comment && (
                  <p className="text-sm text-gray-600">{existingReview.comment}</p>
                )}
                <p className="text-xs text-green-700 font-medium">✓ Review submitted</p>
              </div>
            ) : (
              // Show review form
              <form onSubmit={handleSubmitReview} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Your Rating</label>
                  <StarPicker value={rating} onChange={setRating} />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">Comment (optional)</label>
                  <Textarea
                    placeholder="How was your experience?"
                    rows={3}
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={submittingReview}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {submittingReview ? 'Submitting...' : 'Submit Review'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

---

## Step 7 — Test the Complete End-to-End Flow

This is the full test. Do it in order:

1. **Sign in as customer** (`customer@test.com / password123`)

2. **Browse** → see the two test products → click `+ Add` on "Basmati Rice" → toast appears

3. **Click Cart** in navbar → see the item → increase quantity to 2 → click "Proceed to Checkout"

4. **Checkout** → fill in delivery address → click "Place Order" → redirected to orders page

5. **Orders page** → see your new order with status PENDING

6. **Open a new tab** → sign in as seller (`seller@test.com / password123`)

7. **Seller Orders** → see the customer's order → click "Confirm Order" → status changes to CONFIRMED

8. **Back to customer tab** → refresh orders → see status is now CONFIRMED

9. **Keep advancing** as seller: CONFIRMED → DISPATCHED → DELIVERED

10. **Customer Order Detail** → open the delivered order → see the review form → give 5 stars → submit

11. **Back to Browse** → click on the product → scroll down → see the review you just submitted

---

## You're Done! 🎉

You have built a complete grocery marketplace with:
- ✅ Seller sign up and sign in
- ✅ Customer sign up and sign in
- ✅ Role-based routing (sellers can't access customer pages and vice versa)
- ✅ Seller: Add, edit, delete products
- ✅ Seller: View orders, move them through statuses
- ✅ Customer: Browse and search products
- ✅ Customer: Product detail page with reviews
- ✅ Customer: Cart with quantity management
- ✅ Customer: Checkout with one order per seller
- ✅ Customer: Order tracking
- ✅ Customer: Leave reviews after delivery

### What to Try Next

1. **Add a cancel order button** for customers when order is PENDING
2. **Add stock reduction** — when an order is placed, call `updateProduct` to decrease the stock
3. **Add an image upload** instead of image URLs (look into Cloudinary free tier)
4. **Improve the design** — add animations, better mobile layout
5. **Add search in seller orders** — filter by customer name
