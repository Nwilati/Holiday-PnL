import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarDays,
  Receipt,
  Building2,
  Settings,
  LogOut,
  BarChart3,
  Users,
  Calendar,
  Home,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Bookings', href: '/bookings', icon: CalendarDays },
  { name: 'Expenses', href: '/expenses', icon: Receipt },
  { name: 'Properties', href: '/properties', icon: Building2 },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Users', href: '/users', icon: Users },
];

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-cream-100">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-white border-r border-cream-200 shadow-soft">
        {/* Logo */}
        <div className="p-6 border-b border-cream-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-terracotta-500 rounded-xl flex items-center justify-center shadow-soft">
              <Home className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold text-warm-800">Holiday P&L</h1>
              <p className="text-xs text-warm-500">Property Manager</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-terracotta-50 text-terracotta-600'
                    : 'text-warm-600 hover:bg-cream-100 hover:text-warm-800'
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'text-terracotta-500' : 'text-warm-400'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-cream-200 bg-cream-50">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-9 h-9 bg-sage-100 rounded-full flex items-center justify-center">
              <span className="text-sage-600 font-semibold text-sm">
                {(user?.full_name || user?.email || 'U')[0].toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-warm-800 truncate">
                {user?.full_name || 'User'}
              </p>
              <p className="text-xs text-warm-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 w-full px-4 py-2.5 text-warm-600 hover:bg-cream-200 rounded-xl transition-all duration-200"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-medium">Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-64 min-h-screen">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
