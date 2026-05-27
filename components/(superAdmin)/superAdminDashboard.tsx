import { prisma } from "@/lib/db";

const AdminDashboardPage=async()=>{
     const [
       totalProducts,
       totalShopOwners,
       totalShops,
       totalCustomers,
       revenueData,
     ] = await Promise.all([
       prisma.product.count(),

       prisma.user.count({
         where: {
           role: "SHOP_OWNER",
         },
       }),

       prisma.shop.count(),

       prisma.user.count({
         where: {
           role: "CUSTOMER",
         },
       }),

       prisma.order.aggregate({
         _sum: {
           totalAmount: true,
         },
         where: {
           status: "DELIVERED",
         },
       }),
     ]);

     const totalRevenue = revenueData._sum.totalAmount || 0;
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-8">Super Admin Dashboard</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="border rounded-xl p-6">
            <h2>Total Products</h2>
            <p className="text-3xl font-bold">{totalProducts}</p>
          </div>

          <div className="border rounded-xl p-6">
            <h2>Total Shop Owners</h2>
            <p className="text-3xl font-bold">{totalShopOwners}</p>
          </div>

          <div className="border rounded-xl p-6">
            <h2>Total Shops</h2>
            <p className="text-3xl font-bold">{totalShops}</p>
          </div>

          <div className="border rounded-xl p-6">
            <h2>Total Customers</h2>
            <p className="text-3xl font-bold">{totalCustomers}</p>
          </div>

          <div className="border rounded-xl p-6">
            <h2>Total Revenue</h2>
            <p className="text-3xl font-bold">₹{totalRevenue}</p>
          </div>
        </div>
      </div>
    );
}
export default AdminDashboardPage