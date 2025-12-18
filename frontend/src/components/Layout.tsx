import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarDays,
  Receipt,
  Building2,
  LogOut,
  BarChart3,
  Users,
  Calendar,
  Home,
  FileText,
  BookOpen,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Bookings', href: '/bookings', icon: CalendarDays },
  { name: 'Tenancies', href: '/tenancies', icon: FileText },
  { name: 'Expenses', href: '/expenses', icon: Receipt },
  { name: 'Accounting', href: '/accounting', icon: BookOpen },
  { name: 'Properties', href: '/properties', icon: Building2 },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Users', href: '/users', icon: Users },
];

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { user, logout } = useAuth();

  const getInitials = (name: string | null | undefined, email: string | null | undefined) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return (email || 'U')[0].toUpperCase();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-stone-50 to-orange-50">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-white border-r border-stone-200 flex flex-col z-50">
        {/* Logo */}
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-200">
              <Home className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-stone-800 text-lg">Holiday P&L</h1>
              <p className="text-xs text-stone-400">Property Manager</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-200'
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-stone-200">
          <div className="flex items-center gap-3 px-2 mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
              {getInitials(user?.full_name, user?.email)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-stone-800 text-sm truncate">
                {user?.full_name || 'User'}
              </p>
              <p className="text-xs text-stone-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-stone-500 hover:bg-stone-100 rounded-xl transition-all duration-200"
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
