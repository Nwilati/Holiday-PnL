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
  FileText,
  BookOpen,
  Landmark,
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
  { name: 'Tax Reports', href: '/tax-reports', icon: Landmark },
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
    <div className="min-h-screen flex">
      {/* Sidebar - compact and enterprise */}
      <aside className="w-56 bg-white border-r border-stone-200 flex flex-col h-screen fixed">
        {/* Logo area - compact */}
        <div className="h-14 px-4 flex items-center border-b border-stone-200">
          <span className="font-semibold text-stone-800 text-sm">Holiday P&L</span>
        </div>

        {/* Navigation - dense */}
        <nav className="flex-1 py-2 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-sky-50 text-sky-700 border-r-2 border-sky-700'
                    : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User area - minimal */}
        <div className="p-3 border-t border-stone-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-stone-200 flex items-center justify-center text-xs font-medium text-stone-600">
              {getInitials(user?.full_name, user?.email)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-stone-800 truncate">
                {user?.full_name || 'User'}
              </p>
            </div>
            <button
              onClick={logout}
              className="p-1.5 text-stone-400 hover:text-stone-600 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <main className="flex-1 ml-56 overflow-auto bg-[#f5f6f7] min-h-screen">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
