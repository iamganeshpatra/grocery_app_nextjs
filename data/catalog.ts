export type SeedProduct = {
  name: string
  description: string
  price: number
  category: string
  quantity: string
  stock: number
  brand: string
  imageUrl: string
}

export const CATALOG: SeedProduct[] = [
  // Grains
  { name: "Basmati Rice", description: "Premium long-grain rice", price: 120, category: "Grains", quantity: "1kg", stock: 100, brand: "India Gate", imageUrl: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400" },
  { name: "Sona Masoori Rice", description: "Light everyday rice", price: 90, category: "Grains", quantity: "1kg", stock: 120, brand: "Local", imageUrl: "https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?w=400" },
  { name: "Whole Wheat Atta", description: "Stone-ground wheat flour", price: 55, category: "Grains", quantity: "1kg", stock: 150, brand: "Aashirvaad", imageUrl: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400" },
  { name: "Toor Dal", description: "Split pigeon peas", price: 140, category: "Grains", quantity: "1kg", stock: 80, brand: "Tata Sampann", imageUrl: "https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400" },

  // Dairy
  { name: "Full Cream Milk", description: "Fresh pasteurised milk", price: 32, category: "Dairy", quantity: "500ml", stock: 60, brand: "Amul", imageUrl: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400" },
  { name: "Paneer", description: "Fresh cottage cheese", price: 90, category: "Dairy", quantity: "200g", stock: 40, brand: "Amul", imageUrl: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400" },
  { name: "Curd", description: "Thick set curd", price: 45, category: "Dairy", quantity: "400g", stock: 50, brand: "Mother Dairy", imageUrl: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400" },

  // Vegetables
  { name: "Tomatoes", description: "Farm-fresh tomatoes", price: 28, category: "Vegetables", quantity: "1kg", stock: 90, brand: "Local Farm", imageUrl: "https://images.unsplash.com/photo-1546470427-227df1e3c7d7?w=400" },
  { name: "Onions", description: "Red onions", price: 35, category: "Vegetables", quantity: "1kg", stock: 100, brand: "Local Farm", imageUrl: "https://images.unsplash.com/photo-1518977956812-cd3dbadaaf31?w=400" },
  { name: "Potatoes", description: "Everyday potatoes", price: 30, category: "Vegetables", quantity: "1kg", stock: 110, brand: "Local Farm", imageUrl: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400" },

  // Bakery
  { name: "Whole Wheat Bread", description: "Soft sandwich bread", price: 45, category: "Bakery", quantity: "400g", stock: 35, brand: "Britannia", imageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400" },

  // Beverages
  { name: "Green Tea", description: "Antioxidant-rich green tea", price: 180, category: "Beverages", quantity: "100 bags", stock: 45, brand: "Tetley", imageUrl: "https://images.unsplash.com/photo-1627435601361-ec25f5b1d0e5?w=400" },
]