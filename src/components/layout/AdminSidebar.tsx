'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  Phone, 
  GraduationCap, 
  Upload,
  UserCog,
  Settings,
  Menu,
  X,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth, useRequireAuth } from '@/lib/hooks';
import { LogoutModal } from '@/components/modals';

interface SidebarProps {
  children: React.ReactNode;
}

export function AdminSidebar({ children }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { isAuthorized } = useRequireAuth(['admin', 'super_admin']);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  
  const isSuperAdmin = user?.role === 'super_admin';
  const isAdmin = user?.role === 'admin';

  const navigation = [
    {
      name: 'Dashboard',
      href: isSuperAdmin ? '/super-admin/dashboard' : '/admin/dashboard',
      icon: LayoutDashboard,
      current: pathname.includes('/dashboard'),
      roles: ['admin', 'super_admin'],
    },
    {
      name: 'Students',
      href: '/super-admin/students',
      icon: Users,
      current: pathname.includes('/students'),
      roles: ['super_admin'],
    },
    {
      name: 'Callback Requests',
      href: '/super-admin/callbacks',
      icon: Phone,
      current: pathname.includes('/callbacks'),
      roles: ['super_admin'],
    },
    {
      name: 'Assigned Leads',
      href: '/admin/leads',
      icon: Phone,
      current: pathname.includes('/leads'),
      roles: ['admin'],
    },
    {
      name: 'College Details',
      href: '/super-admin/colleges',
      icon: GraduationCap,
      current: pathname.includes('/colleges'),
      roles: ['super_admin'],
    },
    {
      name: 'Upload Data',
      href: '/super-admin/upload',
      icon: Upload,
      current: pathname.includes('/upload'),
      roles: ['super_admin'],
    },
    {
      name: 'Admin Management',
      href: '/super-admin/admins',
      icon: UserCog,
      current: pathname.includes('/admins'),
      roles: ['super_admin'],
    },
    {
      name: 'Profile',
      href: '/profile',
      icon: Settings,
      current: pathname.includes('/profile'),
      roles: ['admin', 'super_admin'],
    },
  ];

  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(user?.role || '')
  );

  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200 
        transform transition-transform duration-200 ease-in-out
        lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600">
              <span className="text-white font-bold text-sm">R</span>
            </div>
            <span className="font-bold text-lg text-slate-900">
              Rankers <span className="text-indigo-600">Forum</span>
            </span>
          </Link>
          <button 
            className="lg:hidden p-1 text-slate-500"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {filteredNavigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors
                ${item.current 
                  ? 'bg-indigo-50 text-indigo-700' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }
              `}
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon className={`h-5 w-5 ${item.current ? 'text-indigo-600' : ''}`} />
              {item.name}
              {item.current && <ChevronRight className="h-4 w-4 ml-auto" />}
            </Link>
          ))}
        </nav>

        {/* User info at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-full flex items-center justify-center">
              <span className="text-white font-medium text-sm">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-slate-500 capitalize">
                {user?.role?.replace('_', ' ')}
              </p>
            </div>
          </div>
          <Button 
            variant="outline" 
            className="w-full" 
            size="sm"
            onClick={() => setLogoutOpen(true)}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-4 lg:px-8">
          <button 
            className="lg:hidden p-2 text-slate-600"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex-1" />
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8">
          {children}
        </main>
      </div>

      <LogoutModal open={logoutOpen} onOpenChange={setLogoutOpen} />
    </div>
  );
}
