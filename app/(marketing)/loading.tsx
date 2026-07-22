import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center gap-4 px-5 py-16">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96 max-w-full" />
      <div className="mt-10 grid w-full max-w-5xl gap-5 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-72 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
