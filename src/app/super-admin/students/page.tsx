'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Printer, Download, X, Phone, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { INDIAN_STATES } from '@/lib/constants';

interface Student {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  rank: number;
  institution: string;
  yearOfPassout: number;
  domicileState: string;
  gender: string;
  category: string;
  counsellingType: string;
  preferredBranch: string;
  interestedLocations: string[];
  hasCallback: boolean;
}

interface Lead {
  id: string;
  studentId: string;
  studentName: string;
  studentPhone: string;
  studentState: string;
  rank: number;
  course: string;
  status: string;
}

export default function StudentsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthorized, loading: authLoading } = useRequireAuth(['super_admin']);
  
  const [activeTab, setActiveTab] = useState<'details' | 'callback'>('details');
  const [stateFilter, setStateFilter] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedAdminId, setSelectedAdminId] = useState<string>('');

  // Fetch students
  const { data: studentsData, isLoading: studentsLoading } = useQuery({
    queryKey: ['admin-students', stateFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (stateFilter !== 'all') params.append('state', stateFilter);
      const response = await fetch(`/api/super-admin/students?${params}`);
      if (!response.ok) throw new Error('Failed to fetch students');
      return response.json();
    },
    enabled: !!isAuthorized && activeTab === 'details',
  });

  // Fetch callback requests
  const { data: leadsData, isLoading: leadsLoading } = useQuery({
    queryKey: ['callback-requests', stateFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (stateFilter !== 'all') params.append('state', stateFilter);
      params.append('status', 'new');
      const response = await fetch(`/api/admin/leads?${params}`);
      if (!response.ok) throw new Error('Failed to fetch leads');
      return response.json();
    },
    enabled: !!isAuthorized && activeTab === 'callback',
  });

  // Fetch admins for assignment
  const { data: adminsData } = useQuery({
    queryKey: ['available-admins'],
    queryFn: async () => {
      const response = await fetch('/api/super-admin/admins');
      if (!response.ok) throw new Error('Failed to fetch admins');
      return response.json();
    },
    enabled: !!isAuthorized && assignModalOpen,
  });

  // Assign lead mutation
  const assignMutation = useMutation({
    mutationFn: async ({ leadId, adminId }: { leadId: string; adminId: string }) => {
      const response = await fetch(`/api/admin/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedTo: adminId, status: 'assigned' }),
      });
      if (!response.ok) throw new Error('Failed to assign lead');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['callback-requests'] });
      setAssignModalOpen(false);
      setSelectedLead(null);
      setSelectedAdminId('');
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

  const students: Student[] = studentsData?.students || [];
  const leads: Lead[] = leadsData?.leads || [];
  const admins = adminsData?.admins || [];

  const handleViewDetails = (student: Student) => {
    setSelectedStudent(student);
    setDetailsModalOpen(true);
  };

  const handleAssignCallback = (lead: Lead) => {
    setSelectedLead(lead);
    setAssignModalOpen(true);
  };

  return (
    <AdminLayout
      title="Students Details"
      actions={
        <div className="flex items-center gap-3">
          <Select value={stateFilter} onValueChange={setStateFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All States" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All States</SelectItem>
              {INDIAN_STATES.map((state) => (
                <SelectItem key={state} value={state}>{state}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      }
    >
      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab('details')}
          className={`text-sm font-medium pb-2 border-b-2 transition-colors ${
            activeTab === 'details'
              ? 'text-slate-900 border-indigo-600'
              : 'text-slate-500 border-transparent hover:text-slate-700'
          }`}
        >
          Students Details
        </button>
        <button
          onClick={() => setActiveTab('callback')}
          className={`text-sm font-medium pb-2 border-b-2 transition-colors ${
            activeTab === 'callback'
              ? 'text-slate-900 border-indigo-600'
              : 'text-slate-500 border-transparent hover:text-slate-700'
          }`}
        >
          Callback Request
        </button>
      </div>

      {/* Students Table */}
      {activeTab === 'details' && (
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-900 text-white text-sm">
                  <th className="text-left px-6 py-4 font-medium">Name</th>
                  <th className="text-left px-6 py-4 font-medium">Location</th>
                  <th className="text-left px-6 py-4 font-medium">Phone no.</th>
                  <th className="text-left px-6 py-4 font-medium">Email Id</th>
                  <th className="text-left px-6 py-4 font-medium">Rank</th>
                  <th className="text-left px-6 py-4 font-medium">Callback</th>
                  <th className="text-left px-6 py-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {studentsLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center">
                      <Loader2 className="h-6 w-6 animate-spin text-indigo-600 mx-auto" />
                    </td>
                  </tr>
                ) : students.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                      No students found.
                    </td>
                  </tr>
                ) : (
                  students.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm text-slate-900">
                        {student.firstName} {student.lastName}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {student.city}, {student.state}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{student.phone}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{student.email}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{student.rank || '-'}</td>
                      <td className="px-6 py-4">
                        {student.hasCallback ? (
                          <Badge className="bg-green-50 text-green-700 border-green-200">Yes</Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-600 border-slate-200">No</Badge>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewDetails(student)}
                            className="text-indigo-600 hover:text-indigo-700"
                          >
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
      )}

      {/* Callback Requests Table */}
      {activeTab === 'callback' && (
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-900 text-white text-sm">
                  <th className="text-left px-6 py-4 font-medium">Name</th>
                  <th className="text-left px-6 py-4 font-medium">State</th>
                  <th className="text-left px-6 py-4 font-medium">Phone no.</th>
                  <th className="text-left px-6 py-4 font-medium">Rank</th>
                  <th className="text-left px-6 py-4 font-medium">Course</th>
                  <th className="text-left px-6 py-4 font-medium">Status</th>
                  <th className="text-left px-6 py-4 font-medium">Actions</th>
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
                      No callback requests found.
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
                      <td className="px-6 py-4">
                        <Badge className="bg-amber-50 text-amber-700 border-amber-200">
                          Not Assigned
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleAssignCallback(lead)}
                            className="text-indigo-600 hover:text-indigo-700"
                          >
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
      )}

      {/* Student Details Modal */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Student Details</DialogTitle>
          </DialogHeader>
          
          {selectedStudent && (
            <div className="space-y-6">
              {/* Basic and Academic Details */}
              <div>
                <h3 className="text-indigo-700 font-semibold mb-4">Basic and Academic Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Full Name</p>
                    <p className="font-medium">{selectedStudent.firstName} {selectedStudent.lastName}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Phone Number</p>
                    <p className="font-medium">+91 {selectedStudent.phone}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Email Address</p>
                    <p className="font-medium">{selectedStudent.email}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Location</p>
                    <p className="font-medium">{selectedStudent.city}, {selectedStudent.state}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Rank</p>
                    <p className="font-medium">{selectedStudent.rank || '-'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Year of Passout</p>
                    <p className="font-medium">{selectedStudent.yearOfPassout || '-'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Institute</p>
                    <p className="font-medium">{selectedStudent.institution || '-'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Domicile State</p>
                    <p className="font-medium">{selectedStudent.domicileState || '-'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Gender</p>
                    <p className="font-medium capitalize">{selectedStudent.gender || '-'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Category</p>
                    <p className="font-medium uppercase">{selectedStudent.category || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Course and Location Preference */}
              <div>
                <h3 className="text-indigo-700 font-semibold mb-4">Course and Location Preference</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Counselling Type</p>
                    <p className="font-medium">{selectedStudent.counsellingType === 'all_india' ? 'All India Counselling' : 'State Counselling'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Preferred Branch</p>
                    <p className="font-medium uppercase">{selectedStudent.preferredBranch || '-'}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-slate-500 text-sm mb-2">Interested Study Locations</p>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    {selectedStudent.interestedLocations?.slice(0, 3).map((loc, i) => (
                      <div key={i}>
                        <p className="text-slate-400 text-xs">{i + 1}{i === 0 ? 'st' : i === 1 ? 'nd' : 'rd'} Preference</p>
                        <p className="font-medium">{loc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign Callback Modal */}
      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent className="sm:max-w-md">
          {selectedLead && (
            <>
              <div className="bg-slate-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-slate-500">Student Name</p>
                <p className="font-semibold text-slate-900">{selectedLead.studentName}</p>
                <p className="text-sm text-slate-500 mt-2">Location</p>
                <p className="text-slate-700">{selectedLead.studentState}</p>
              </div>

              <h3 className="text-lg font-semibold text-slate-900 mb-2">Assign Callback Request</h3>
              <p className="text-sm text-slate-500 mb-4">Select an admin to assign the callback request</p>

              <div className="space-y-3 max-h-64 overflow-y-auto">
                {admins.map((admin: { id: string; firstName: string; lastName: string; email: string; activeLeads: number }) => (
                  <label
                    key={admin.id}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedAdminId === admin.id
                        ? 'border-indigo-600 bg-indigo-50'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="admin"
                        value={admin.id}
                        checked={selectedAdminId === admin.id}
                        onChange={() => setSelectedAdminId(admin.id)}
                        className="text-indigo-600"
                      />
                      <div>
                        <p className="font-medium text-slate-900">{admin.firstName} {admin.lastName}</p>
                        <p className="text-sm text-slate-500">{admin.email}</p>
                      </div>
                    </div>
                    <span className="text-sm text-slate-500">{admin.activeLeads} active tasks</span>
                  </label>
                ))}
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setAssignModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => selectedLead && assignMutation.mutate({ leadId: selectedLead.id, adminId: selectedAdminId })}
                  disabled={!selectedAdminId || assignMutation.isPending}
                >
                  {assignMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Assign →'
                  )}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
