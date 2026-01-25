'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertTriangle, GraduationCap, Phone, ChevronDown, Building2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth, useRequireAuth } from '@/lib/hooks';
import { useQuery } from '@tanstack/react-query';
import { INDIAN_STATES } from '@/lib/constants';
import { LogoutModal } from '@/components/modals';

interface College {
  id: string;
  collegeName: string;
  collegeLocation: string;
  collegeType: string;
  branch: string;
  quota: string;
  category: string;
  openingRank: number;
  closingRank: number;
  year: number;
  chance: 'high' | 'moderate' | 'low';
}

export default function PreviousYearPage() {
  const router = useRouter();
  const { loading: authLoading } = useAuth();
  const { isAuthorized } = useRequireAuth(['student']);
  
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'government' | 'private' | 'deemed'>('government');
  const [stateFilter, setStateFilter] = useState('all');
  const [expandedCollege, setExpandedCollege] = useState<string | null>(null);

  // Fetch previous year data
  const { data, isLoading } = useQuery({
    queryKey: ['previous-year-colleges'],
    queryFn: async () => {
      const response = await fetch('/api/colleges/previous-year');
      if (!response.ok) throw new Error('Failed to fetch data');
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

  const colleges: College[] = data?.colleges || [];
  const filteredColleges = colleges.filter(college => {
    const matchesType = college.collegeType === activeTab;
    const matchesState = stateFilter === 'all' || college.collegeLocation.includes(stateFilter);
    return matchesType && matchesState;
  });

  // Group by year
  const collegesByYear = filteredColleges.reduce((acc, college) => {
    const year = college.year;
    if (!acc[year]) acc[year] = [];
    acc[year].push(college);
    return acc;
  }, {} as Record<number, College[]>);

  const years = Object.keys(collegesByYear).map(Number).sort((a, b) => b - a);

  const getChanceBadge = (chance: string) => {
    switch (chance) {
      case 'high':
        return <Badge className="bg-green-50 text-green-700 border-green-200 hover:bg-green-50">High Chance</Badge>;
      case 'moderate':
        return <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50">Moderate Chance</Badge>;
      case 'low':
        return <Badge className="bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-100">Low Chance</Badge>;
      default:
        return null;
    }
  };

  const getChanceIndicatorColor = (chance: string) => {
    switch (chance) {
      case 'high': return 'bg-green-500';
      case 'moderate': return 'bg-amber-500';
      case 'low': return 'bg-slate-400';
      default: return 'bg-slate-300';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-900">
                Rankers<span className="text-indigo-600">Forum</span>
              </span>
            </div>

            <div className="flex items-center gap-4">
              <a href="tel:+919876543210" className="flex items-center gap-2 text-indigo-600">
                <Phone className="h-5 w-5" />
              </a>
              <button
                onClick={() => setLogoutOpen(true)}
                className="text-red-600 hover:text-red-700 font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Title and Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Previous Year Predictions</h1>
            <p className="text-amber-600 flex items-center gap-2 mt-1 text-sm">
              <AlertTriangle className="h-4 w-4" />
              The previous year college lists are generated using historical counselling data for the same rank and are for reference purpose only.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">State</span>
            <Select value={stateFilter} onValueChange={setStateFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All States" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {INDIAN_STATES.map((state) => (
                  <SelectItem key={state} value={state}>
                    {state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { value: 'government', label: 'Government' },
            { value: 'private', label: 'Private' },
            { value: 'deemed', label: 'Deemed' },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value as typeof activeTab)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
                activeTab === tab.value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Description */}
        <p className="text-slate-600 mb-6">Previous Year (Colleges you would have gotten with your current rank)</p>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        ) : years.length > 0 ? (
          <div className="space-y-8">
            {years.map((year) => (
              <div key={year}>
                {/* Year Header */}
                <h3 className="text-xl font-bold text-slate-900 mb-4">{year}</h3>

                {/* College List */}
                <div className="space-y-4">
                  {collegesByYear[year].map((college) => (
                    <div
                      key={college.id}
                      className="bg-white rounded-xl border border-slate-100 overflow-hidden"
                    >
                      <div className="flex items-center p-5">
                        {/* Chance Indicator Bar */}
                        <div className={`w-1 h-16 rounded-full ${getChanceIndicatorColor(college.chance)} mr-5`}></div>

                        {/* College Info */}
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-900 text-lg">{college.collegeName}</h3>
                          <p className="text-slate-500 text-sm">{college.collegeLocation}</p>
                        </div>

                        {/* Details Grid */}
                        <div className="hidden sm:grid grid-cols-3 gap-8 text-center">
                          <div>
                            <p className="text-xs text-slate-400 mb-1">Quota</p>
                            <p className="text-sm font-medium text-slate-700">{college.quota === 'all_india' ? 'All India' : college.quota.replace('_', ' ')}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 mb-1">Closing Rank</p>
                            <p className="text-sm font-medium text-slate-700">{college.closingRank.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 mb-1">Course</p>
                            <p className="text-sm font-medium text-slate-700">{college.branch.toUpperCase()}</p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col items-end gap-2 ml-6">
                          {getChanceBadge(college.chance)}
                          <button
                            onClick={() => setExpandedCollege(expandedCollege === college.id ? null : college.id)}
                            className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700"
                          >
                            <ChevronDown className={`h-4 w-4 transition-transform ${expandedCollege === college.id ? 'rotate-180' : ''}`} />
                            View Details
                          </button>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {expandedCollege === college.id && (
                        <div className="border-t border-slate-100 p-5 bg-slate-50">
                          <div className="grid sm:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-slate-500">Category</p>
                              <p className="font-medium">{college.category.toUpperCase()}</p>
                            </div>
                            <div>
                              <p className="text-slate-500">Opening Rank</p>
                              <p className="font-medium">{college.openingRank.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-slate-500">Closing Rank</p>
                              <p className="font-medium">{college.closingRank.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-slate-500">Quota</p>
                              <p className="font-medium">{college.quota === 'all_india' ? 'All India' : college.quota.replace('_', ' ')}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-100 p-12 text-center">
            <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No previous year data available.</p>
          </div>
        )}

        {/* Back Link */}
        <div className="mt-8">
          <button
            onClick={() => router.back()}
            className="text-indigo-600 hover:text-indigo-700 font-medium"
          >
            ← Back to Current Year Results
          </button>
        </div>
      </main>

      <LogoutModal open={logoutOpen} onOpenChange={setLogoutOpen} />
    </div>
  );
}
