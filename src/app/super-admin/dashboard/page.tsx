'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, FileText, CheckCircle, Phone, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useRequireAuth } from '@/lib/hooks';
import { useQuery } from '@tanstack/react-query';

interface DashboardStats {
  totalRegistrations: number;
  totalInfoFilled: number;
  totalRequests: number;
  pendingCallbacks: number;
}

interface Lead {
  id: string;
  studentName: string;
  studentPhone: string;
  studentState: string;
  rank: number;
  course: string;
  status: string;
  assignedAt: string;
}

export default function SuperAdminDashboard() {
  const router = useRouter();
  const { isAuthorized, loading: authLoading } = useRequireAuth(['super_admin', 'admin']);

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async () => {
      const response = await fetch('/api/admin/dashboard');
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    },
    enabled: !!isAuthorized,
  });

  const { data: leadsData, isLoading: leadsLoading } = useQuery({
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

  const stats: DashboardStats = statsData?.stats || {
    totalRegistrations: 0,
    totalInfoFilled: 0,
    totalRequests: 0,
    pendingCallbacks: 0,
  };

  const leads: Lead[] = leadsData?.leads || [];

  const statCards = [
    { label: 'Total Registrations', value: stats.totalRegistrations, icon: FileText, color: 'bg-indigo-50 text-indigo-600' },
    { label: 'Total Info Filled', value: stats.totalInfoFilled, icon: CheckCircle, color: 'bg-green-50 text-green-600' },
    { label: 'Total Requests', value: stats.totalRequests, icon: Users, color: 'bg-amber-50 text-amber-600' },
    { label: 'Pending Callbacks', value: stats.pendingCallbacks, icon: Phone, color: 'bg-purple-50 text-purple-600' },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50">Pending</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50">In Progress</Badge>;
      case 'completed':
        return <Badge className="bg-green-50 text-green-700 border-green-200 hover:bg-green-50">Completed</Badge>;
      default:
        return <Badge className="bg-slate-50 text-slate-600 border-slate-200">{status}</Badge>;
    }
  };

  return (
    <AdminLayout title="Dashboard">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl p-6 border border-slate-100">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl ${stat.color} flex items-center justify-center`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-slate-500">{stat.label}</p>
                <p className="text-2xl font-bold text-slate-900">
                  {statsLoading ? '...' : stat.value.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Assigned Callbacks Table */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">Assigned Callbacks</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-900 text-white text-sm">
                <th className="text-left px-6 py-4 font-medium">Name</th>
                <th className="text-left px-6 py-4 font-medium">State</th>
                <th className="text-left px-6 py-4 font-medium">Phone no.</th>
                <th className="text-left px-6 py-4 font-medium">Rank</th>
                <th className="text-left px-6 py-4 font-medium">Course</th>
                <th className="text-left px-6 py-4 font-medium">Assigned on</th>
                <th className="text-left px-6 py-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leadsLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center">
                    <Loader2 className="h-6 w-6 animate-spin text-indigo-600 mx-auto" />
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    No assigned callbacks yet.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm text-slate-900">{lead.studentName}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{lead.studentState}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{lead.studentPhone}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{lead.rank}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{lead.course}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{lead.assignedAt}</td>
                    <td className="px-6 py-4">{getStatusBadge(lead.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
