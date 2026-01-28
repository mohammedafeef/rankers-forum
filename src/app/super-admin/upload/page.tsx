// 'use client';

// import { useState, useEffect, useRef } from 'react';
// import { useRouter } from 'next/navigation';
// import { Loader2, Upload, FileSpreadsheet, CheckCircle2, XCircle, Clock } from 'lucide-react';
// import { AdminSidebar } from '@/components/layout';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { Button } from '@/components/ui/button';
// import { Badge } from '@/components/ui/badge';
// import { useAuth, useRequireAuth } from '@/lib/hooks';
// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// interface UploadLog {
//   id: string;
//   year: number;
//   fileName: string;
//   totalRows: number;
//   processedRows: number;
//   failedRows: number;
//   status: 'processing' | 'completed' | 'failed';
//   errorLog: string[];
//   createdAt: { _seconds: number };
// }

// export default function SuperAdminUploadPage() {
//   const router = useRouter();
//   const queryClient = useQueryClient();
//   const fileInputRef = useRef<HTMLInputElement>(null);
//   const { loading: authLoading } = useAuth();
//   const { isAuthorized } = useRequireAuth(['super_admin']);
  
//   const [dragActive, setDragActive] = useState(false);

//   // Fetch upload history
//   const { data, isLoading } = useQuery({
//     queryKey: ['upload-history'],
//     queryFn: async () => {
//       const response = await fetch('/api/super-admin/colleges/upload');
//       if (!response.ok) throw new Error('Failed to fetch upload history');
//       return response.json();
//     },
//     enabled: !!isAuthorized,
//   });

//   // Upload mutation
//   const uploadMutation = useMutation({
//     mutationFn: async (file: File) => {
//       const formData = new FormData();
//       formData.append('file', file);

//       const response = await fetch('/api/super-admin/colleges/upload', {
//         method: 'POST',
//         body: formData,
//       });

//       if (!response.ok) {
//         const error = await response.json();
//         throw new Error(error.error || 'Upload failed');
//       }

//       return response.json();
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ['upload-history'] });
//       queryClient.invalidateQueries({ queryKey: ['college-years'] });
//     },
//   });

//   const handleDrag = (e: React.DragEvent) => {
//     e.preventDefault();
//     e.stopPropagation();
//     if (e.type === 'dragenter' || e.type === 'dragover') {
//       setDragActive(true);
//     } else if (e.type === 'dragleave') {
//       setDragActive(false);
//     }
//   };

//   const handleDrop = (e: React.DragEvent) => {
//     e.preventDefault();
//     e.stopPropagation();
//     setDragActive(false);

//     if (e.dataTransfer.files && e.dataTransfer.files[0]) {
//       handleFile(e.dataTransfer.files[0]);
//     }
//   };

//   const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     if (e.target.files && e.target.files[0]) {
//       handleFile(e.target.files[0]);
//     }
//   };

//   const handleFile = (file: File) => {
//     if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
//       alert('Please upload an Excel file (.xlsx or .xls)');
//       return;
//     }
//     uploadMutation.mutate(file);
//   };

//   useEffect(() => {
//     if (!authLoading && !isAuthorized) {
//       router.push('/');
//     }
//   }, [authLoading, isAuthorized, router]);

//   if (authLoading || !isAuthorized) {
//     return (
//       <div className="min-h-screen flex items-center justify-center bg-slate-50">
//         <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
//       </div>
//     );
//   }

//   const uploads: UploadLog[] = data?.uploads || [];

//   return (
//     <AdminSidebar>
//       <div className="space-y-6">
//         <div>
//           <h1 className="text-2xl font-bold text-slate-900">Upload College Data</h1>
//           <p className="text-slate-600">Upload Excel file with college and cutoff data</p>
//         </div>

//         {/* Upload Area */}
//         <Card>
//           <CardContent className="p-8">
//             <div
//               className={`
//                 border-2 border-dashed rounded-xl p-12 text-center transition-colors
//                 ${dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'}
//                 ${uploadMutation.isPending ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
//               `}
//               onDragEnter={handleDrag}
//               onDragLeave={handleDrag}
//               onDragOver={handleDrag}
//               onDrop={handleDrop}
//               onClick={() => fileInputRef.current?.click()}
//             >
//               <input
//                 ref={fileInputRef}
//                 type="file"
//                 accept=".xlsx,.xls"
//                 onChange={handleChange}
//                 className="hidden"
//               />

//               {uploadMutation.isPending ? (
//                 <div className="space-y-4">
//                   <Loader2 className="h-12 w-12 text-indigo-600 mx-auto animate-spin" />
//                   <p className="text-lg font-medium text-slate-900">Uploading...</p>
//                   <p className="text-sm text-slate-500">Please wait while we process your file</p>
//                 </div>
//               ) : (
//                 <div className="space-y-4">
//                   <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto">
//                     <Upload className="h-8 w-8 text-indigo-600" />
//                   </div>
//                   <div>
//                     <p className="text-lg font-medium text-slate-900">
//                       Drop your Excel file here
//                     </p>
//                     <p className="text-sm text-slate-500 mt-1">
//                       or click to browse files (.xlsx, .xls)
//                     </p>
//                   </div>
//                 </div>
//               )}
//             </div>

//             {uploadMutation.error && (
//               <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
//                 {uploadMutation.error.message}
//               </div>
//             )}

//             {uploadMutation.isSuccess && (
//               <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm flex items-center gap-2">
//                 <CheckCircle2 className="h-5 w-5" />
//                 Upload successful! Processing data in background.
//               </div>
//             )}

//             {/* Expected Format */}
//             <div className="mt-6 p-4 bg-slate-50 rounded-lg">
//               <h4 className="font-medium text-slate-900 mb-2">Expected Excel Format</h4>
//               <p className="text-sm text-slate-600 mb-3">
//                 Your Excel file should contain the following columns:
//               </p>
//               <div className="flex flex-wrap gap-2">
//                 {['College Name', 'Location', 'Type', 'Branch', 'Year', 'Category', 'Quota', 'Opening Rank', 'Closing Rank'].map((col) => (
//                   <Badge key={col} variant="secondary" className="text-xs">
//                     {col}
//                   </Badge>
//                 ))}
//               </div>
//             </div>
//           </CardContent>
//         </Card>

//         {/* Upload History */}
//         <Card>
//           <CardHeader>
//             <CardTitle>Upload History</CardTitle>
//           </CardHeader>
//           <CardContent>
//             {isLoading ? (
//               <div className="flex items-center justify-center py-8">
//                 <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
//               </div>
//             ) : uploads.length > 0 ? (
//               <div className="space-y-4">
//                 {uploads.map((upload) => (
//                   <div
//                     key={upload.id}
//                     className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
//                   >
//                     <div className="flex items-center gap-4">
//                       <div className={`p-2 rounded-lg ${
//                         upload.status === 'completed' ? 'bg-green-100' :
//                         upload.status === 'failed' ? 'bg-red-100' :
//                         'bg-amber-100'
//                       }`}>
//                         {upload.status === 'completed' ? (
//                           <CheckCircle2 className="h-5 w-5 text-green-600" />
//                         ) : upload.status === 'failed' ? (
//                           <XCircle className="h-5 w-5 text-red-600" />
//                         ) : (
//                           <Clock className="h-5 w-5 text-amber-600" />
//                         )}
//                       </div>
//                       <div>
//                         <p className="font-medium text-slate-900">{upload.fileName}</p>
//                         <p className="text-sm text-slate-500">
//                           Year: {upload.year} • {upload.processedRows}/{upload.totalRows} rows
//                         </p>
//                       </div>
//                     </div>
//                     <div className="text-right">
//                       <Badge variant={
//                         upload.status === 'completed' ? 'completed' :
//                         upload.status === 'failed' ? 'destructive' :
//                         'warning'
//                       }>
//                         {upload.status}
//                       </Badge>
//                       {upload.failedRows > 0 && (
//                         <p className="text-xs text-red-600 mt-1">
//                           {upload.failedRows} failed
//                         </p>
//                       )}
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             ) : (
//               <p className="text-center text-slate-500 py-8">No uploads yet.</p>
//             )}
//           </CardContent>
//         </Card>
//       </div>
//     </AdminSidebar>
//   );
// }
