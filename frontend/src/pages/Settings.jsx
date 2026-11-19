import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Settings() {
  const { organization, setOrganization } = useAuth();
  const [threshold, setThreshold] = useState(5);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get('/settings').then((res) => {
      setThreshold(res.data.defaultLowStockThresh);
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaved(false);
    const { data } = await api.put('/settings', {
      defaultLowStockThresh: Number(threshold),
    });
    setOrganization(data);
    localStorage.setItem('stockflow_org', JSON.stringify(data));
    setSaved(true);
  };

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Organization Settings</h1>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-500">Organization Name</label>
          <p className="text-base font-semibold text-slate-900 mt-1">{organization?.name}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Default Low Stock Threshold
            </label>
            <p className="text-xs text-slate-500 mb-2">
              Used whenever an individual product does not specify its own threshold.
            </p>
            <input
              type="number"
              min="0"
              required
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              className="w-32 px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition cursor-pointer"
          >
            Save Settings
          </button>

          {saved && (
            <p className="text-sm text-emerald-600 font-medium">
              Settings updated successfully.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}