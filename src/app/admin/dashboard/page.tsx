'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Users, FileCheck, PhoneCall, Clock } from 'lucide-react';
import { AdminSidebar } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth, useRequireAuth } from '@/lib/hooks';
import { useQuery } from '@tanstack/react-query';

interface DashboardStats {
  totalRegistrations: number;
  totalInfoFilled: number;
  totalRequests: number;
  pendingCallbacks: number;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { loading: authLoading } = useAuth();
  const { isAuthorized } = useRequireAuth(['admin']);

  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async () => {
      const response = await fetch('/api/admin/dashboard');
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json() as Promise<{ stats: DashboardStats; pendingCallbacks: number }>;
    },
    enabled: !!isAuthorized,
  });

  // Fetch assigned leads
  const { data: leadsData } = useQuery({
    queryKey: ['admin-leads'],
    queryFn: async () => {
      const response = await fetch('/api/admin/leads');
      if (!response.ok) throw new Error('Failed to fetch leads');
      return response.json();
    },
    enabled: !!isAuthorized,
  });

  useEffect(() => {
    if (!authLoading && !isAuthorized) {
      router.push('/');
    }
  }, [authLoading, isAuthorized, router]);

  if (authLoading || !isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const statCards = [
    {
      title: 'Assigned Leads',
      value: leadsData?.leads?.length || 0,
      icon: Users,
      color: 'bg-blue-500',
    },
    {
      title: 'Pending Callbacks',
      value: stats?.pendingCallbacks || 0,
      icon: PhoneCall,
      color: 'bg-amber-500',
    },
    {
      title: 'Completed Today',
      value: leadsData?.leads?.filter((l: { status: string }) => l.status === 'completed')?.length || 0,
      icon: FileCheck,
      color: 'bg-emerald-500',
    },
    {
      title: 'In Progress',
      value: leadsData?.leads?.filter((l: { status: string }) => l.status === 'in_progress')?.length || 0,
      icon: Clock,
      color: 'bg-violet-500',
    },
  ];

  return (
    <AdminSidebar>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-600">Welcome back! Here&apos;s your overview.</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {statCards.map((stat) => (
                <Card key={stat.title}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${stat.color}`}>
                        <stat.icon className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                        <p className="text-sm text-slate-500">{stat.title}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Recent Leads Table */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Assigned Leads</CardTitle>
              </CardHeader>
              <CardContent>
                {leadsData?.leads?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-sm text-slate-500 border-b">
                          <th className="pb-3 font-medium">Student</th>
                          <th className="pb-3 font-medium">Phone</th>
                          <th className="pb-3 font-medium">Location</th>
                          <th className="pb-3 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leadsData.leads.slice(0, 5).map((lead: {
                          id: string;
                          studentName: string;
                          studentPhone: string;
                          studentLocation: string;
                          status: string;
                        }) => (
                          <tr key={lead.id} className="border-b last:border-0">
                            <td className="py-4 font-medium text-slate-900">{lead.studentName}</td>
                            <td className="py-4 text-slate-600">{lead.studentPhone}</td>
                            <td className="py-4 text-slate-600">{lead.studentLocation}</td>
                            <td className="py-4">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                lead.status === 'completed' ? 'bg-green-100 text-green-700' :
                                lead.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                                'bg-amber-100 text-amber-700'
                              }`}>
                                {lead.status.replace('_', ' ')}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-center text-slate-500 py-8">No leads assigned yet.</p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminSidebar>
  );
}
