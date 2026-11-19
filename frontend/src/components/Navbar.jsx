import { Link, useLocation } from 'react-router-dom';
import { Package, LayoutDashboard, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { organization, logout } = useAuth();
  const { pathname } = useLocation();

  const navClass = (path) =>
    `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition ${
      pathname === path
        ? 'bg-indigo-600 text-white'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg text-indigo-600">
            <Package className="w-6 h-6" />
            <span>StockFlow</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link to="/" className={navClass('/')}>
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Link>
            <Link to="/products" className={navClass('/products')}>
              <Package className="w-4 h-4" />
              Products
            </Link>
            <Link to="/settings" className={navClass('/settings')}>
              <Settings className="w-4 h-4" />
              Settings
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-slate-700 bg-slate-100 px-3 py-1 rounded-full">
            {organization?.name}
          </span>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-red-600 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}