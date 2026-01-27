'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Upload, Edit, Download, Users, UserPlus, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useRequireAuth } from '@/lib/hooks';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { JOB_TYPES } from '@/lib/constants';

interface Admin {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  employeeNumber: string;
  jobTitle: string;
  jobType: string;
  isActive: boolean;
  activeLeads: number;
}

export default function AdminManagementPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthorized, loading: authLoading } = useRequireAuth(['super_admin']);
  
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newAdmin, setNewAdmin] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    employeeNumber: '',
    jobTitle: '',
    jobType: 'full_time',
    maxActiveLeads: 50,
  });

  const { data: adminsData, isLoading } = useQuery({
    queryKey: ['admins'],
    queryFn: async () => {
      const response = await fetch('/api/super-admin/admins');
      if (!response.ok) throw new Error('Failed to fetch admins');
      return response.json();
    },
    enabled: !!isAuthorized,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof newAdmin) => {
      const response = await fetch('/api/super-admin/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create admin');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      setCreateModalOpen(false);
      setNewAdmin({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        employeeNumber: '',
        jobTitle: '',
        jobType: 'full_time',
        maxActiveLeads: 50,
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ adminId, isActive }: { adminId: string; isActive: boolean }) => {
      const response = await fetch('/api/super-admin/admins', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId, isActive }),
      });
      if (!response.ok) throw new Error('Failed to update admin');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins'] });
    },
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

  const admins: Admin[] = adminsData?.admins || [];

  return (
    <AdminLayout
      title="Admin Management"
      actions={
        <div className="flex items-center gap-3">
          <Button size="sm" onClick={() => setCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Admin
          </Button>
        </div>
      }
    >
      {/* Admins Table */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-900 text-white text-sm">
                <th className="text-left px-6 py-4 font-medium">Admin Name</th>
                <th className="text-left px-6 py-4 font-medium">Employee Number</th>
                <th className="text-left px-6 py-4 font-medium">Phone no.</th>
                <th className="text-left px-6 py-4 font-medium">Email Id</th>
                <th className="text-left px-6 py-4 font-medium">Callback</th>
                <th className="text-left px-6 py-4 font-medium">Active</th>
                <th className="text-left px-6 py-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center">
                    <Loader2 className="h-6 w-6 animate-spin text-indigo-600 mx-auto" />
                  </td>
                </tr>
              ) : admins.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    No admins found. Click "Edit" to add one.
                  </td>
                </tr>
              ) : (
                admins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm text-slate-900">
                      {admin.firstName} {admin.lastName}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{admin.employeeNumber || '-'}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{admin.phone}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{admin.email}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{admin.activeLeads}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleActiveMutation.mutate({ adminId: admin.id, isActive: !admin.isActive })}
                        disabled={toggleActiveMutation.isPending}
                      >
                        {admin.isActive ? (
                          <Badge className="bg-green-50 text-green-700 border-green-200 cursor-pointer">Yes</Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-600 border-slate-200 cursor-pointer">No</Badge>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button className="text-indigo-600 hover:text-indigo-700">
                          <Users className="h-5 w-5" />
                        </button>
                        <button className="text-slate-400 hover:text-slate-600">
                          <Download className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Admin Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Admin</DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate(newAdmin);
            }}
            className="space-y-4"
          >
            {createMutation.error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-100">
                {createMutation.error.message}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input
                  value={newAdmin.firstName}
                  onChange={(e) => setNewAdmin({ ...newAdmin, firstName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input
                  value={newAdmin.lastName}
                  onChange={(e) => setNewAdmin({ ...newAdmin, lastName: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={newAdmin.email}
                onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={newAdmin.phone}
                onChange={(e) => setNewAdmin({ ...newAdmin, phone: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                value={newAdmin.password}
                onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                required
                minLength={6}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Employee Number</Label>
                <Input
                  value={newAdmin.employeeNumber}
                  onChange={(e) => setNewAdmin({ ...newAdmin, employeeNumber: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Job Title</Label>
                <Input
                  value={newAdmin.jobTitle}
                  onChange={(e) => setNewAdmin({ ...newAdmin, jobTitle: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Job Type</Label>
                <Select
                  value={newAdmin.jobType}
                  onValueChange={(v) => setNewAdmin({ ...newAdmin, jobType: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {JOB_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Max Active Leads</Label>
                <Input
                  type="number"
                  value={newAdmin.maxActiveLeads}
                  onChange={(e) => setNewAdmin({ ...newAdmin, maxActiveLeads: parseInt(e.target.value) || 50 })}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Create Admin
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
