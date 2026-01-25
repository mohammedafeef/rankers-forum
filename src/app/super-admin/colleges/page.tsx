'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Upload, Edit, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useRequireAuth } from '@/lib/hooks';
import { useQuery } from '@tanstack/react-query';
import { AVAILABLE_YEARS } from '@/lib/constants';

interface College {
  id: string;
  collegeName: string;
  collegeLocation: string;
  collegeType: string;
  branch: string;
  closingRank: number;
  status: string;
}

export default function CollegePage() {
  const router = useRouter();
  const { isAuthorized, loading: authLoading } = useRequireAuth(['super_admin']);
  
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const { data: collegesData, isLoading } = useQuery({
    queryKey: ['colleges', selectedYear],
    queryFn: async () => {
      const response = await fetch(`/api/super-admin/colleges?year=${selectedYear}`);
      if (!response.ok) throw new Error('Failed to fetch colleges');
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

  const colleges: College[] = collegesData?.colleges || [];

  return (
    <AdminLayout
      title="College Details"
      actions={
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </Button>
          <Button size="sm">
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </div>
      }
    >
      {/* Year Tabs */}
      <div className="flex gap-4 mb-6">
        {AVAILABLE_YEARS.map((year) => (
          <button
            key={year}
            onClick={() => setSelectedYear(year)}
            className={`text-sm font-medium pb-2 border-b-2 transition-colors ${
              selectedYear === year
                ? 'text-slate-900 border-indigo-600'
                : 'text-slate-500 border-transparent hover:text-slate-700'
            }`}
          >
            {year}
          </button>
        ))}
      </div>

      {/* Colleges Table */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-900 text-white text-sm">
                <th className="text-left px-6 py-4 font-medium">College Name</th>
                <th className="text-left px-6 py-4 font-medium">Location</th>
                <th className="text-left px-6 py-4 font-medium">Type</th>
                <th className="text-left px-6 py-4 font-medium">Cutoff</th>
                <th className="text-left px-6 py-4 font-medium">Course</th>
                <th className="text-left px-6 py-4 font-medium">Status</th>
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
              ) : colleges.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    No colleges found for {selectedYear}.
                  </td>
                </tr>
              ) : (
                colleges.map((college) => (
                  <tr key={college.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm text-slate-900">{college.collegeName}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{college.collegeLocation}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 capitalize">{college.collegeType}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{college.closingRank}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 uppercase">{college.branch}</td>
                    <td className="px-6 py-4">
                      {college.status === 'active' ? (
                        <Badge className="bg-green-50 text-green-700 border-green-200">Assigned</Badge>
                      ) : (
                        <Badge className="bg-amber-50 text-amber-700 border-amber-200">Not Assigned</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button className="text-indigo-600 hover:text-indigo-700">
                          <Edit className="h-5 w-5" />
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
    </AdminLayout>
  );
}
