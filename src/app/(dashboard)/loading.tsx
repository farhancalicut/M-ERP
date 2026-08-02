import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-8 p-6 md:p-8">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-10 w-1/3 bg-slate-200 dark:bg-slate-800" />
        <Skeleton className="h-5 w-1/2 bg-slate-100 dark:bg-slate-800/50" />
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-24 bg-slate-100 dark:bg-slate-800" />
              <Skeleton className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-800" />
            </div>
            <Skeleton className="h-8 w-20 bg-slate-200 dark:bg-slate-700" />
            <Skeleton className="h-4 w-32 bg-slate-50 dark:bg-slate-800/50" />
          </div>
        ))}
      </div>

      {/* Main Content Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-6">
          <Skeleton className="h-6 w-48 bg-slate-200 dark:bg-slate-800" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg bg-slate-100 dark:bg-slate-800/50" />
            ))}
          </div>
        </div>
        <div className="lg:col-span-1 p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-6">
          <Skeleton className="h-6 w-32 bg-slate-200 dark:bg-slate-800" />
          <div className="space-y-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-10 w-10 rounded-full shrink-0 bg-slate-100 dark:bg-slate-800" />
                <div className="space-y-2 flex-1 py-1">
                  <Skeleton className="h-4 w-3/4 bg-slate-100 dark:bg-slate-800/80" />
                  <Skeleton className="h-3 w-1/2 bg-slate-50 dark:bg-slate-800/50" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
