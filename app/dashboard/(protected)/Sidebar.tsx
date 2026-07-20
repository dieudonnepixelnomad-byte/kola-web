"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

const NAV = [
  { href: "/dashboard", label: "Vue d’ensemble", dot: "#3ddc84" },
  { href: "/dashboard/abonnes", label: "Abonnés", dot: "#7fae97" },
];

export function Sidebar({ userName }: { userName: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await authClient.signOut();
    router.push("/dashboard/login");
  }

  const initiales = userName
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside className="flex flex-col gap-5 bg-kola-forest p-4 text-[#cfe4d9]">
      <div className="flex items-center gap-2.5 px-1.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-kola-accent text-[19px] font-extrabold text-kola-forest-dark">
          k
        </div>
        <span className="text-[19px] font-extrabold tracking-tight text-white">
          Kola
        </span>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
        <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[#7fae97]">
          Application
        </div>
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-sm font-bold text-white">Kola Test App</div>
            <div className="text-[11px] text-[#8bbaa1]">Android · Premium</div>
          </div>
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        {NAV.map((n) => {
          const active = pathname === n.href;
          return (
            <Link
              key={n.href}
              href={n.href}
              className={
                "flex w-full items-center gap-2.5 rounded-[11px] px-3 py-2.5 text-sm font-semibold transition-colors " +
                (active
                  ? "bg-kola-accent text-white"
                  : "text-[#a9cebc] hover:bg-white/[0.06]")
              }
            >
              <span
                className="h-[7px] w-[7px] flex-none rounded-full"
                style={{ background: n.dot }}
              />
              {n.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-3.5">
        <div className="rounded-xl border border-kola-accent/30 bg-kola-accent/[0.14] p-3">
          <div className="mb-0.5 text-[11px] font-semibold text-[#9fd3b6]">
            Provider connecté
          </div>
          <div className="flex items-center gap-1.5 text-[13px] font-bold text-white">
            <span className="h-2 w-2 rounded-full bg-[#3ddc84] shadow-[0_0_0_3px_#3ddc8433]" />
            Campay · Sandbox
          </div>
        </div>
        <div className="flex items-center gap-2.5 border-t border-white/10 pt-3.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-kola-accent text-[13px] font-extrabold text-kola-forest-dark">
            {initiales}
          </div>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-bold text-white">{userName}</div>
            <div className="text-[11px] text-[#8bbaa1]">Éditeur</div>
          </div>
          <button
            onClick={handleLogout}
            className="ml-auto text-[15px] text-[#8bbaa1] hover:text-white"
            aria-label="Déconnexion"
          >
            ⏻
          </button>
        </div>
      </div>
    </aside>
  );
}
