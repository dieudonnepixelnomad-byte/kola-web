import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col">
      <div className="mb-6">
        <Skeleton className="h-6 w-48" />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-[15px] border border-kola-border bg-white p-4">
            <Skeleton className="mb-2 h-3 w-16" />
            <Skeleton className="mb-1.5 h-7 w-10" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-kola-border bg-white p-4.5 lg:max-w-md">
        <Skeleton className="mb-1 h-4 w-48" />
        <Skeleton className="mb-4 h-3 w-32" />
        <Skeleton className="mb-5 h-3 w-full rounded-full" />
        <div className="flex flex-col gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
