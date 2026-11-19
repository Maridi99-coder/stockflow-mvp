import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, Layers, AlertTriangle, Plus } from 'lucide-react';
import api from '../api/client';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/dashboard')
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-slate-500">Loading dashboard...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <Link
          to="/products"
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          <Plus className="w-4 h-4" />
          Manage Products
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Total Products</p>
            <p className="text-2xl font-bold text-slate-900">{data?.totalProducts ?? 0}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Total Units in Stock</p>
            <p className="text-2xl font-bold text-slate-900">{data?.totalQuantity ?? 0}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Low Stock Alerts</p>
            <p className="text-2xl font-bold text-slate-900">
              {data?.lowStockItems?.length ?? 0}
            </p>
          </div>
        </div>
      </div>

      {/* Low Stock Items Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Low Stock Items</h2>
          <span className="text-xs text-slate-500">
            Default org threshold: {data?.defaultLowStockThresh} units
          </span>
        </div>

        {data?.lowStockItems?.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            All products are adequately stocked.
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-xs uppercase border-b border-slate-200">
                <th className="px-6 py-3">Product</th>
                <th className="px-6 py-3">SKU</th>
                <th className="px-6 py-3">On Hand</th>
                <th className="px-6 py-3">Threshold</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {data?.lowStockItems?.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-medium text-slate-900">{item.name}</td>
                  <td className="px-6 py-3 text-slate-600 font-mono text-xs">{item.sku}</td>
                  <td className="px-6 py-3">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                      {item.quantityOnHand}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-slate-600">{item.effectiveThreshold}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}