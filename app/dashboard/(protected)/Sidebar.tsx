"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

const NAV = [
  { href: "/dashboard", label: "Vue d’ensemble", dot: "#3ddc84" },
  { href: "/dashboard/apps", label: "Apps", dot: "#12a05e" },
  { href: "/dashboard/abonnes", label: "Abonnés", dot: "#7fae97" },
  { href: "/dashboard/paiements", label: "Paiements", dot: "#9a6206" },
  { href: "/dashboard/relances", label: "Relances", dot: "#c14a2c" },
  { href: "/dashboard/parametres/prestataires", label: "Prestataires", dot: "#6f6a5e" },
  { href: "/dashboard/parametres/webhooks", label: "Webhooks", dot: "#3ddc84" },
  { href: "/dashboard/parametres/equipe", label: "Équipe", dot: "#0e3b28" },
  { href: "/dashboard/parametres/facturation", label: "Facturation", dot: "#98917f" },
];

export function Sidebar({
  userName,
  tenantNom,
  provider,
}: {
  userName: string;
  tenantNom: string;
  provider: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await authClient.signOut();
    router.push("/connexion");
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
            <div className="text-sm font-bold text-white">{tenantNom}</div>
            <div className="text-[11px] text-[#8bbaa1]">Tenant</div>
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
            {provider ? "Provider connecté" : "Aucun provider"}
          </div>
          <div className="flex items-center gap-1.5 text-[13px] font-bold text-white">
            <span
              className="h-2 w-2 rounded-full"
              style={
                provider
                  ? { background: "#3ddc84", boxShadow: "0 0 0 3px #3ddc8433" }
                  : { background: "#c14a2c", boxShadow: "0 0 0 3px #c14a2c33" }
              }
            />
            {provider ?? "À configurer"}
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
