'use client';

import { useState } from 'react';
import { LogoutModal } from '@/components/modals';
import { AdminSidebar } from './AdminSidebar';

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  actions?: React.ReactNode;
}

export function AdminLayout({ children, title, actions }: AdminLayoutProps) {
  const [logoutOpen, setLogoutOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <AdminSidebar onLogoutClick={() => setLogoutOpen(true)} />

      {/* Main Content */}
      <div className="flex-1 ml-64">
        {/* Header */}
        <header className="h-16 bg-white   flex items-center justify-between px-8 sticky top-0 z-40">
          <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
          {actions && <div className="flex items-center gap-3">{actions}</div>}
        </header>

        {/* Page Content */}
        <main className="p-5">
          {children}
        </main>
        
      </div>

        
      <LogoutModal open={logoutOpen} onOpenChange={setLogoutOpen} />
    </div>
  );
}
