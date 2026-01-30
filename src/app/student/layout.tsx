'use client';

import React from 'react';
import { Navbar } from '@/components/layout';
import { useAuth } from '@/lib/hooks';

export default function StudentLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, loading } = useAuth();

    return (
        <div className="min-h-screen flex flex-col">
            <Navbar
                user={user}
                loading={loading}
                onLoginClick={() => window.location.href = '/'} // Redirect to home if clicking login
                onRegisterClick={() => window.location.href = '/'} // Redirect to home if clicking register
            />
            <main className="flex-1 mt-20">
                {children}
            </main>
        </div>
    );
}
