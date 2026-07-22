import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col">
      <div className="mb-4.5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Skeleton className="mb-1.5 h-6 w-28" />
          <Skeleton className="h-3.5 w-40" />
        </div>
        <Skeleton className="h-8 w-32 rounded-md" />
      </div>

      <div className="mb-3.5 flex flex-wrap gap-1.5">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-7 w-20 rounded-lg" />
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-kola-border bg-white">
        <div className="grid grid-cols-5 gap-3 border-b border-kola-border bg-[#faf7ef] px-4.5 py-2.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-3 w-16" />
          ))}
        </div>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="grid grid-cols-5 items-center gap-3 border-b border-[#f4efe4] px-4.5 py-3 last:border-b-0">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="ml-auto h-4 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}
