import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main
      className="flex min-h-screen flex-col items-center px-5 pb-10 pt-6.5"
      style={{
        background: "radial-gradient(120% 60% at 50% 0%, #e7f4ec 0%, #f2ede1 55%)",
      }}
    >
      <div className="w-[390px] max-w-full rounded-[44px] bg-[#0e2a1e] p-2.5 shadow-[0_40px_80px_-30px_rgba(14,42,30,.6)]">
        <div className="relative min-h-[600px] overflow-hidden rounded-[34px] bg-[#f7f4ec]">
          <div className="flex items-center justify-between px-6.5 pb-2 pt-3.5 text-[13px] font-bold text-kola-text">
            <span>9:41</span>
            <span className="tracking-widest">● ● ●  5G ▮</span>
          </div>

          <div className="flex items-center gap-2.5 px-5.5 pb-4 pt-1.5">
            <div className="flex h-6.5 w-6.5 items-center justify-center rounded-lg bg-kola-accent text-[15px] font-extrabold text-kola-forest-dark">
              k
            </div>
            <span className="text-base font-extrabold tracking-tight">Kola</span>
          </div>

          <div className="flex flex-col gap-4 px-5.5 pb-6.5">
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-full" />
          </div>
        </div>
      </div>
    </main>
  );
}
