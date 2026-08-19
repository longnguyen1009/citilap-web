import { DollarSign, ShoppingCart, TrendingUp, Users } from "lucide-react";

export default function DashboardPage() {
  const stats = [
    { name: "Total Revenue", value: "$45,231.89", change: "+20.1%", icon: DollarSign, color: "text-green-600", bg: "bg-green-100" },
    { name: "Sales", value: "+2350", change: "+180.1%", icon: ShoppingCart, color: "text-blue-600", bg: "bg-blue-100" },
    { name: "Active Users", value: "+12,234", change: "+19%", icon: Users, color: "text-indigo-600", bg: "bg-indigo-100" },
    { name: "Conversion Rate", value: "3.2%", change: "+1.2%", icon: TrendingUp, color: "text-orange-600", bg: "bg-orange-100" },
  ];

  const recentOrders = [
    { id: "ORD-001", customer: "John Doe", product: "MacBook Pro 16\"", date: "2026-08-19", amount: "$3,499.00", status: "Completed" },
    { id: "ORD-002", customer: "Jane Smith", product: "iPhone 15 Pro", date: "2026-08-19", amount: "$1,199.00", status: "Processing" },
    { id: "ORD-003", customer: "Robert Johnson", product: "AirPods Pro", date: "2026-08-18", amount: "$249.00", status: "Completed" },
    { id: "ORD-004", customer: "Emily Davis", product: "Apple Watch Ultra", date: "2026-08-18", amount: "$799.00", status: "Pending" },
    { id: "ORD-005", customer: "Michael Wilson", product: "iPad Pro", date: "2026-08-17", amount: "$1,099.00", status: "Completed" },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="text-sm text-gray-500">Welcome back, here's what's happening with your store today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {stats.map((item) => (
          <div key={item.name} className="bg-white overflow-hidden rounded-xl border border-gray-200 shadow-sm">
            <div className="p-5">
              <div className="flex items-center">
                <div className={`flex-shrink-0 rounded-md p-3 ${item.bg}`}>
                  <item.icon className={`h-6 w-6 ${item.color}`} aria-hidden="true" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">{item.name}</dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">{item.value}</div>
                      <div className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                        {item.change}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Mock Chart Area */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-base font-semibold leading-6 text-gray-900">Revenue Overview</h3>
          </div>
          <div className="p-6">
            <div className="h-72 w-full flex items-end gap-2 justify-between">
              {[40, 60, 45, 80, 55, 90, 75, 100, 85, 120, 105, 140].map((height, i) => (
                <div key={i} className="w-full bg-blue-100 rounded-t-sm relative group cursor-pointer" style={{ height: `${(height / 140) * 100}%` }}>
                  <div className="absolute bottom-0 w-full bg-blue-600 rounded-t-sm transition-all duration-300 group-hover:bg-indigo-600 h-full"></div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-between text-xs text-gray-400">
              <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span>
              <span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span><span>Nov</span><span>Dec</span>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-base font-semibold leading-6 text-gray-900">Recent Orders</h3>
          </div>
          <div className="px-6 py-2">
            <ul className="divide-y divide-gray-200">
              {recentOrders.slice(0, 4).map((order) => (
                <li key={order.id} className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{order.customer}</p>
                      <p className="text-xs text-gray-500">{order.product}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">{order.amount}</p>
                      <p className={`text-xs font-medium ${
                        order.status === 'Completed' ? 'text-green-600' : 
                        order.status === 'Processing' ? 'text-blue-600' : 'text-yellow-600'
                      }`}>
                        {order.status}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
            <a href="/admin/orders" className="text-sm font-medium text-blue-600 hover:text-blue-500">
              View all orders &rarr;
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
