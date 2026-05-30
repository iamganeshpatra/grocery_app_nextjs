# Student Guide — 03: Seller Pages

In this section you will replace the placeholder seller pages with real, working ones.

Seller features:
- **Dashboard** — overview stats (products count, orders count, recent orders)
- **Products** — add, edit, delete their own products
- **Orders** — see incoming orders, update order status

---

## Step 1 — Seller Dashboard

The dashboard shows a quick summary of the seller's business.

Replace `src/pages/seller/Dashboard.jsx`:

```jsx
// src/pages/seller/Dashboard.jsx
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { getProductsBySeller } from '@/api/products'
import { getOrdersBySeller } from '@/api/orders'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function SellerDashboard() {
  const { user } = useAuth()
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const [p, o] = await Promise.all([
          getProductsBySeller(user.id),
          getOrdersBySeller(user.id),
        ])
        setProducts(p)
        setOrders(o)
      } catch (err) {
        console.error('Failed to load dashboard data', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [user.id])

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>

  const pendingOrders = orders.filter(o => o.status === 'PENDING')
  const recentOrders = orders.slice(0, 5)

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome, {user.name}!</h1>
        <p className="text-gray-500 text-sm">{user.shopName}</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Products</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{products.length}</p>
            <Link to="/seller/products" className="text-xs text-green-700 underline mt-1 block">
              Manage products →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{orders.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Pending Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-600">{pendingOrders.length}</p>
            {pendingOrders.length > 0 && (
              <Link to="/seller/orders" className="text-xs text-green-700 underline mt-1 block">
                View orders →
              </Link>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent Orders</CardTitle>
          <Button variant="outline" size="sm" asChild>
            <Link to="/seller/orders">View All</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <p className="text-gray-500 text-sm">No orders yet.</p>
          ) : (
            <div className="space-y-3">
              {recentOrders.map(order => (
                <div key={order.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{order.customerName}</p>
                    <p className="text-xs text-gray-500">
                      {order.items.length} item(s) · ₹{order.totalAmount}
                    </p>
                  </div>
                  <StatusBadge status={order.status} />
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

## Step 2 — Seller Products Page

This page lets the seller:
- See all their products
- Add a new product (via a form that appears above the list)
- Edit an existing product (same form, pre-filled)
- Delete a product

Replace `src/pages/seller/Products.jsx`:

```jsx
// src/pages/seller/Products.jsx
import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { getProductsBySeller, createProduct, updateProduct, deleteProduct } from '@/api/products'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

const CATEGORIES = ['Grains', 'Dairy', 'Vegetables', 'Fruits', 'Meat & Fish', 'Beverages', 'Snacks', 'Bakery', 'Other']

// Empty form state (reused for both add and edit)
const EMPTY_FORM = {
  name: '',
  description: '',
  price: '',
  category: '',
  stock: '',
  imageUrl: '',
}

export default function SellerProducts() {
  const { user } = useAuth()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)  // null = adding new, string = editing existing
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  // Load products on mount
  useEffect(() => {
    loadProducts()
  }, [])

  async function loadProducts() {
    try {
      const data = await getProductsBySeller(user.id)
      setProducts(data)
    } catch {
      toast.error('Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  // Open form to add a new product
  function handleAddNew() {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setShowForm(true)
  }

  // Open form to edit an existing product (pre-fill with its current values)
  function handleEdit(product) {
    setForm({
      name: product.name,
      description: product.description || '',
      price: String(product.price),
      category: product.category,
      stock: String(product.stock),
      imageUrl: product.imageUrl || '',
    })
    setEditingId(product.id)
    setShowForm(true)
    // Scroll to top to show the form
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleCancel() {
    setShowForm(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (!form.category) { toast.error('Please select a category'); return }
    if (Number(form.price) <= 0) { toast.error('Price must be greater than 0'); return }
    if (Number(form.stock) < 0) { toast.error('Stock cannot be negative'); return }

    setSaving(true)

    try {
      if (editingId) {
        // Editing an existing product
        const updated = await updateProduct(editingId, {
          name: form.name.trim(),
          description: form.description.trim(),
          price: Number(form.price),
          category: form.category,
          stock: Number(form.stock),
          imageUrl: form.imageUrl.trim(),
        })

        // Update local state without re-fetching
        setProducts(prev => prev.map(p => p.id === editingId ? { ...p, ...updated } : p))
        toast.success('Product updated!')

      } else {
        // Adding a new product
        const newProduct = await createProduct({
          name: form.name.trim(),
          description: form.description.trim(),
          price: Number(form.price),
          category: form.category,
          stock: Number(form.stock),
          imageUrl: form.imageUrl.trim(),
          sellerId: user.id,
          sellerName: user.shopName,
        })

        setProducts(prev => [newProduct, ...prev])
        toast.success('Product added!')
      }

      handleCancel()

    } catch {
      toast.error('Failed to save product')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(product) {
    if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return

    try {
      await deleteProduct(product.id)
      setProducts(prev => prev.filter(p => p.id !== product.id))
      toast.success('Product deleted')
    } catch {
      toast.error('Failed to delete product')
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Loading products...</div>

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">My Products</h1>
          <p className="text-gray-500 text-sm">{products.length} products</p>
        </div>
        {!showForm && (
          <Button onClick={handleAddNew} className="bg-green-600 hover:bg-green-700">
            + Add Product
          </Button>
        )}
      </div>

      {/* Add / Edit Form */}
      {showForm && (
        <Card className="border-2 border-green-200">
          <CardHeader>
            <CardTitle className="text-base">
              {editingId ? 'Edit Product' : 'Add New Product'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Product Name *</label>
                  <Input name="name" required placeholder="e.g. Basmati Rice 1kg" value={form.name} onChange={handleChange} />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">Category *</label>
                  <select
                    name="category"
                    required
                    value={form.category}
                    onChange={handleChange}
                    className="w-full border rounded-md px-3 py-2 text-sm bg-white"
                  >
                    <option value="">Select category</option>
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">Price (₹) *</label>
                  <Input name="price" type="number" min="1" step="0.01" required placeholder="0.00" value={form.price} onChange={handleChange} />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">Stock Quantity *</label>
                  <Input name="stock" type="number" min="0" required placeholder="0" value={form.stock} onChange={handleChange} />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Description</label>
                <Textarea name="description" placeholder="Brief description of the product" rows={2} value={form.description} onChange={handleChange} />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Image URL</label>
                <Input name="imageUrl" placeholder="https://... (optional)" value={form.imageUrl} onChange={handleChange} />
              </div>

              <div className="flex gap-3">
                <Button type="submit" disabled={saving} className="bg-green-600 hover:bg-green-700">
                  {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Product'}
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Products List */}
      {products.length === 0 ? (
        <div className="text-center py-16 border rounded-lg bg-gray-50">
          <p className="text-gray-500">You haven't added any products yet.</p>
          <Button onClick={handleAddNew} className="mt-4 bg-green-600 hover:bg-green-700">
            Add Your First Product
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {products.map(product => (
            <Card key={product.id}>
              <CardContent className="p-4 flex items-center gap-4">
                {/* Product image */}
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.name} className="w-16 h-16 object-cover rounded-md flex-shrink-0" />
                ) : (
                  <div className="w-16 h-16 bg-gray-100 rounded-md flex items-center justify-center flex-shrink-0 text-2xl">
                    🥦
                  </div>
                )}

                {/* Product info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{product.name}</p>
                    <Badge variant="secondary" className="text-xs">{product.category}</Badge>
                  </div>
                  {product.description && (
                    <p className="text-sm text-gray-500 truncate">{product.description}</p>
                  )}
                  <div className="flex gap-4 text-sm mt-1">
                    <span className="font-semibold text-green-700">₹{product.price}</span>
                    <span className={`font-medium ${product.stock === 0 ? 'text-red-600' : product.stock <= 5 ? 'text-orange-600' : 'text-gray-600'}`}>
                      {product.stock === 0 ? 'Out of stock' : `${product.stock} in stock`}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-shrink-0">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(product)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(product)}>
                    Delete
                  </Button>
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

## Step 3 — Seller Orders Page

The seller can see all incoming orders and move them through statuses.

Order status flow: `PENDING → CONFIRMED → DISPATCHED → DELIVERED`

Replace `src/pages/seller/Orders.jsx`:

```jsx
// src/pages/seller/Orders.jsx
import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { getOrdersBySeller, updateOrderStatus } from '@/api/orders'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'

// What button label to show and what the next status is
const NEXT_STATUS = {
  PENDING: { label: 'Confirm Order', next: 'CONFIRMED' },
  CONFIRMED: { label: 'Mark Dispatched', next: 'DISPATCHED' },
  DISPATCHED: { label: 'Mark Delivered', next: 'DELIVERED' },
}

// Tab filter options
const TABS = ['All', 'Pending', 'Active', 'Delivered']

export default function SellerOrders() {
  const { user } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('All')
  const [updatingId, setUpdatingId] = useState(null)

  useEffect(() => {
    loadOrders()
  }, [])

  async function loadOrders() {
    try {
      const data = await getOrdersBySeller(user.id)
      setOrders(data)
    } catch {
      toast.error('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  async function handleStatusUpdate(order) {
    const transition = NEXT_STATUS[order.status]
    if (!transition) return

    setUpdatingId(order.id)

    try {
      await updateOrderStatus(order.id, transition.next)
      // Update in local state without re-fetching
      setOrders(prev =>
        prev.map(o => o.id === order.id ? { ...o, status: transition.next } : o)
      )
      toast.success(`Order marked as ${transition.next}`)
    } catch {
      toast.error('Failed to update order status')
    } finally {
      setUpdatingId(null)
    }
  }

  // Filter orders based on active tab
  const filteredOrders = orders.filter(order => {
    if (activeTab === 'All') return true
    if (activeTab === 'Pending') return order.status === 'PENDING'
    if (activeTab === 'Active') return ['CONFIRMED', 'DISPATCHED'].includes(order.status)
    if (activeTab === 'Delivered') return order.status === 'DELIVERED'
    return true
  })

  if (loading) return <div className="p-8 text-center text-gray-500">Loading orders...</div>

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Orders</h1>
        <p className="text-gray-500 text-sm">{orders.length} total orders</p>
      </div>

      {/* Tab filters */}
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
            {tab === 'Pending' && orders.filter(o => o.status === 'PENDING').length > 0 && (
              <span className="ml-1 bg-yellow-100 text-yellow-800 text-xs px-1.5 rounded-full">
                {orders.filter(o => o.status === 'PENDING').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Orders list */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-gray-50">
          <p className="text-gray-500">No {activeTab !== 'All' ? activeTab.toLowerCase() : ''} orders found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map(order => (
            <Card key={order.id}>
              <CardContent className="p-5">
                {/* Order header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">Order #{order.id.slice(-6).toUpperCase()}</p>
                      <StatusBadge status={order.status} />
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {new Date(order.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <p className="font-bold text-lg">₹{order.totalAmount}</p>
                </div>

                {/* Customer info */}
                <div className="bg-gray-50 rounded-md p-3 mb-4 text-sm">
                  <p><span className="font-medium">Customer:</span> {order.customerName}</p>
                  <p><span className="font-medium">Deliver to:</span> {order.address}</p>
                </div>

                {/* Items */}
                <div className="space-y-1 mb-4">
                  <p className="text-sm font-medium">Items:</p>
                  {order.items.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm text-gray-600">
                      <span>{item.productName} × {item.quantity}</span>
                      <span>₹{item.price * item.quantity}</span>
                    </div>
                  ))}
                </div>

                {/* Action button — only show if there's a next status */}
                {NEXT_STATUS[order.status] && (
                  <Button
                    size="sm"
                    onClick={() => handleStatusUpdate(order)}
                    disabled={updatingId === order.id}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {updatingId === order.id ? 'Updating...' : NEXT_STATUS[order.status].label}
                  </Button>
                )}

                {order.status === 'DELIVERED' && (
                  <p className="text-sm text-green-700 font-medium">✓ Order completed</p>
                )}
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

## Test the Seller Flow

1. Sign in as `seller@test.com / password123`
2. **Dashboard** — should show 2 products, 0 orders, 0 pending
3. **Products** → click "Add Product" → fill form → submit → product appears in list
4. **Edit** a product → update price → save → new price shows
5. **Delete** a product → it disappears
6. (Orders will be tested after building the customer checkout)

Proceed to `04-customer.md`.
