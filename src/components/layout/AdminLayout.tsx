'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  GraduationCap, 
  LayoutDashboard, 
  Users, 
  Building2, 
  UserCog,
  UserCircle,
} from 'lucide-react';
import { useAuth } from '@/lib/hooks';
import { LogoutModal } from '@/components/modals';
import { cn } from '@/lib/utils';

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  actions?: React.ReactNode;
}

const sidebarLinks = [
  { href: '/super-admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/super-admin/students', label: 'Students', icon: Users },
  { href: '/super-admin/colleges', label: 'College', icon: Building2 },
  { href: '/super-admin/admins', label: 'Admin', icon: UserCog },
  { href: '/super-admin/profile', label: 'Profile', icon: UserCircle },
];

export function AdminLayout({ children, title, actions }: AdminLayoutProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [logoutOpen, setLogoutOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col fixed inset-y-0 left-0 z-50">
        {/* Logo */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-xl flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold">Rankers</span>
              <span className="text-indigo-400">Forum</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {sidebarLinks.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                )}
              >
                <link.icon className="h-5 w-5" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-medium">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-slate-400 truncate">
                {user?.role === 'super_admin' ? 'Super Admin' : 'Admin'}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 ml-64">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-8 sticky top-0 z-40">
          <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
          {actions && <div className="flex items-center gap-3">{actions}</div>}
        </header>

        {/* Page Content */}
        <main className="p-8">
          {children}
        </main>
      </div>

      <LogoutModal open={logoutOpen} onOpenChange={setLogoutOpen} />
    </div>
  );
}
