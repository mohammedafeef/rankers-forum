'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, AlertTriangle, GraduationCap, ArrowRight, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth, useRequireAuth } from '@/lib/hooks';
import { useMutation, useQuery } from '@tanstack/react-query';
import { 
  NEET_CATEGORIES, 
  QUOTA_TYPES, 
  MEDICAL_BRANCHES, 
  INDIAN_STATES,
  GENDERS,
} from '@/lib/constants';
import { LogoutModal } from '@/components/modals';

const studentInfoSchema = z.object({
  rank: z.string().min(1, 'Rank is required'),
  institution: z.string().optional(),
  year: z.string().min(1, 'Year is required'),
  domicileState: z.string().min(1, 'Domicile state is required'),
  category: z.string().min(1, 'Category is required'),
  gender: z.string().min(1, 'Gender is required'),
  counsellingType: z.string().min(1, 'Counselling type is required'),
  preferredBranch: z.string().min(1, 'Preferred branch is required'),
  preference1: z.string().min(1, '1st preference is required'),
  preference2: z.string().optional(),
  preference3: z.string().optional(),
  confirmAccuracy: z.boolean().refine(val => val === true, 'Please confirm the information is accurate'),
});

type StudentInfoData = z.infer<typeof studentInfoSchema>;

export default function StudentInfoPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { isAuthorized } = useRequireAuth(['student']);
  const [logoutOpen, setLogoutOpen] = useState(false);

  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear - 1, currentYear - 2];

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<StudentInfoData>({
    resolver: zodResolver(studentInfoSchema),
    defaultValues: {
      year: currentYear.toString(),
      confirmAccuracy: false,
    },
  });

  // Check if student has already used their checks
  const { data: profileData } = useQuery({
    queryKey: ['student-profile'],
    queryFn: async () => {
      const response = await fetch('/api/students/profile');
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!isAuthorized,
  });

  const submitMutation = useMutation({
    mutationFn: async (data: StudentInfoData) => {
      // First save profile
      const profileResponse = await fetch('/api/students/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lastRankUsed: parseInt(data.rank),
          lastCategory: data.category,
          lastQuota: data.counsellingType,
          lastPreferredBranch: data.preferredBranch,
          lastDomicileState: data.domicileState,
          institution: data.institution || '',
          gender: data.gender,
          yearOfPassout: parseInt(data.year),
          interestedLocations: [data.preference1, data.preference2, data.preference3].filter(Boolean),
        }),
      });

      if (!profileResponse.ok) {
        const error = await profileResponse.json();
        throw new Error(error.error || 'Failed to save profile');
      }

      // Then get eligible colleges
      const params = new URLSearchParams({
        rank: data.rank,
        category: data.category,
        quota: data.counsellingType,
        branch: data.preferredBranch,
        domicileState: data.domicileState,
        year: data.year,
      });

      const collegesResponse = await fetch(`/api/colleges/eligible?${params}`);
      if (!collegesResponse.ok) {
        const error = await collegesResponse.json();
        throw new Error(error.error || 'Failed to get colleges');
      }

      return collegesResponse.json();
    },
    onSuccess: (data) => {
      // Store result in sessionStorage and redirect
      sessionStorage.setItem('collegeResult', JSON.stringify(data));
      router.push('/student/result');
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

  const checksRemaining = 2 - (profileData?.student?.checksCount || 0);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
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
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Enter Your Details</h1>
          <p className="text-amber-600 flex items-center gap-2 mt-2 text-sm">
            <AlertTriangle className="h-4 w-4" />
            Please enter your details carefully! Once Saved, They Cannot Be Edited Or Updated Later.
          </p>
        </div>

        <form onSubmit={handleSubmit((data) => submitMutation.mutate(data))} className="space-y-10">
          {submitMutation.error && (
            <div className="p-4 text-sm text-red-600 bg-red-50 rounded-lg border border-red-100">
              {submitMutation.error.message}
            </div>
          )}

          {/* Basic and Academic Details */}
          <section>
            <h2 className="text-lg font-semibold text-indigo-700 mb-6">Basic and Academic Details</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="rank">Rank</Label>
                <Input
                  id="rank"
                  type="number"
                  placeholder="Enter Your Rank"
                  className="h-12"
                  {...register('rank')}
                />
                {errors.rank && <p className="text-sm text-red-500">{errors.rank.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="institution">Institution</Label>
                <Input
                  id="institution"
                  placeholder="Enter the Institution"
                  className="h-12"
                  {...register('institution')}
                />
              </div>

              <div className="space-y-2">
                <Label>Year</Label>
                <Select onValueChange={(v) => setValue('year', v)} defaultValue={currentYear.toString()}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select Year of Passout" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.year && <p className="text-sm text-red-500">{errors.year.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Domicile State (The state where you are eligible for state quota seats)</Label>
                <Select onValueChange={(v) => setValue('domicileState', v)}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select Your Domicile State" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDIAN_STATES.map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.domicileState && <p className="text-sm text-red-500">{errors.domicileState.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Select onValueChange={(v) => setValue('category', v)}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {NEET_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category && <p className="text-sm text-red-500">{errors.category.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Gender</Label>
                <Select onValueChange={(v) => setValue('gender', v)}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select Gender" />
                  </SelectTrigger>
                  <SelectContent>
                    {GENDERS.map((gender) => (
                      <SelectItem key={gender.value} value={gender.value}>
                        {gender.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.gender && <p className="text-sm text-red-500">{errors.gender.message}</p>}
              </div>
            </div>
          </section>

          {/* Course and Location Preference */}
          <section>
            <h2 className="text-lg font-semibold text-indigo-700 mb-6">Course and Location Preference</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Counselling Type</Label>
                <Select onValueChange={(v) => setValue('counsellingType', v)}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select Counselling Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {QUOTA_TYPES.map((quota) => (
                      <SelectItem key={quota.value} value={quota.value}>
                        {quota.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.counsellingType && <p className="text-sm text-red-500">{errors.counsellingType.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Preferred Branch</Label>
                <Select onValueChange={(v) => setValue('preferredBranch', v)}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select Your Preferred Branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {MEDICAL_BRANCHES.map((branch) => (
                      <SelectItem key={branch.value} value={branch.value}>
                        {branch.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.preferredBranch && <p className="text-sm text-red-500">{errors.preferredBranch.message}</p>}
              </div>
            </div>

            <div className="mt-6">
              <Label className="mb-3 block">Interested Study Location ( Select 3 locations according to your preference )</Label>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Select onValueChange={(v) => setValue('preference1', v)}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="1st Preference" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDIAN_STATES.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.preference1 && <p className="text-sm text-red-500">{errors.preference1.message}</p>}
                </div>

                <div className="space-y-2">
                  <Select onValueChange={(v) => setValue('preference2', v)}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="2nd Preference" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDIAN_STATES.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Select onValueChange={(v) => setValue('preference3', v)}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="3rd Preference" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDIAN_STATES.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </section>

          {/* Confirmation */}
          <div className="flex items-start gap-3">
            <Checkbox
              id="confirmAccuracy"
              onCheckedChange={(checked) => setValue('confirmAccuracy', checked === true)}
            />
            <Label htmlFor="confirmAccuracy" className="text-sm text-slate-600 leading-relaxed cursor-pointer">
              I confirm that all the information provided is accurate and final. I agree to proceed with the entered details.
            </Label>
          </div>
          {errors.confirmAccuracy && <p className="text-sm text-red-500">{errors.confirmAccuracy.message}</p>}

          {/* Submit Button */}
          <div className="flex justify-center pt-4">
            <Button
              type="submit"
              size="lg"
              className="h-14 px-12 rounded-full text-base"
              disabled={submitMutation.isPending || checksRemaining <= 0}
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Save and Continue
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </div>

          {checksRemaining <= 0 && (
            <p className="text-center text-amber-600 text-sm">
              You have used all your free checks. Contact support for more.
            </p>
          )}
        </form>
      </main>

      <LogoutModal open={logoutOpen} onOpenChange={setLogoutOpen} />
    </div>
  );
}
