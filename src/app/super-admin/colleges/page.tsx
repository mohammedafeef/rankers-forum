'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Upload, Edit, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useRequireAuth } from '@/lib/hooks';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AVAILABLE_YEARS } from '@/lib/constants';
import { UploadDialog } from '@/components/modals/UploadDialog';

interface College {
  id: string;
  collegeName: string;
  collegeLocation: string;
  type: string;
  courseCode: string;
  courseName: string;
  category: string;
  rank: number;
  status: string;
}

export default function CollegePage() {
  const router = useRouter();
  const { isAuthorized, loading: authLoading } = useRequireAuth(['super_admin']);
  const queryClient = useQueryClient();
  
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  const { data: collegesData, isLoading } = useQuery({
    queryKey: ['colleges', selectedYear],
    queryFn: async () => {
      const response = await fetch(`/api/super-admin/colleges?year=${selectedYear}`);
      if (!response.ok) throw new Error('Failed to fetch colleges');
      return response.json();
    },
    enabled: !!isAuthorized,
  });

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    // Invalidate and refetch the query for the new year
    queryClient.invalidateQueries({ queryKey: ['colleges', year] });
  };

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

  const colleges: College[] = collegesData?.cutoffs || [];

  return (
    <AdminLayout
      title="College Details"
      actions={
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setUploadDialogOpen(true)}>
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
            onClick={() => handleYearChange(year)}
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
                <th className="text-left px-6 py-4 font-medium">Category</th>
                <th className="text-left px-6 py-4 font-medium">Rank</th>
                <th className="text-left px-6 py-4 font-medium">Course Code</th>
                <th className="text-left px-6 py-4 font-medium">Course Name</th>
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
                    <td className="px-6 py-4 text-sm text-slate-600">{college.category}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{college.rank}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 ">{college.courseCode}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 uppercase">{college.courseName}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Upload Dialog */}
      <UploadDialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen} />
    </AdminLayout>
  );
}
