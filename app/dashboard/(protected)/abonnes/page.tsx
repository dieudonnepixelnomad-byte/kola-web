import { headers } from "next/headers";
import Link from "next/link";
import { CopyButton } from "./CopyButton";

type Abonnement = {
  id: string;
  statut: "ACTIF" | "TOLERANCE" | "COUPE" | "EXPIRE";
  dateEcheance: string | null;
  lienPaiement: string;
  abonne: { identifiantExterne: string };
  offre: { nom: string };
  transactions: { recuLe: string; statut: string }[];
  logsRelance: { type: "J_MOINS_3" | "J_PLUS_7"; envoyeLe: string }[];
};

const STATUT_STYLE: Record<Abonnement["statut"], { bg: string; fg: string }> = {
  ACTIF: { bg: "var(--color-kola-actif-bg)", fg: "var(--color-kola-actif-fg)" },
  TOLERANCE: { bg: "var(--color-kola-tolerance-bg)", fg: "var(--color-kola-tolerance-fg)" },
  COUPE: { bg: "var(--color-kola-coupe-bg)", fg: "var(--color-kola-coupe-fg)" },
  EXPIRE: { bg: "var(--color-kola-expire-bg)", fg: "var(--color-kola-expire-fg)" },
};

const STATUT_LABEL: Record<Abonnement["statut"], string> = {
  ACTIF: "Actif",
  TOLERANCE: "Tolérance",
  COUPE: "Coupé",
  EXPIRE: "Expiré",
};

async function getAbonnements(): Promise<Abonnement[]> {
  const h = await headers();
  const host = h.get("host");
  const protocole = process.env.NODE_ENV === "production" ? "https" : "http";
  const res = await fetch(`${protocole}://${host}/api/admin/abonnes`, {
    headers: { cookie: h.get("cookie") ?? "" },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.abonnements;
}

export default async function AbonnesPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string }>;
}) {
  const { statut } = await searchParams;
  const abonnements = await getAbonnements();
  const h = await headers();
  const host = h.get("host");
  const protocole = process.env.NODE_ENV === "production" ? "https" : "http";
  const baseUrl = `${protocole}://${host}`;

  const filtre = statut ?? "tous";
  const counts: Record<string, number> = { tous: abonnements.length };
  for (const a of abonnements) {
    counts[a.statut] = (counts[a.statut] ?? 0) + 1;
  }
  counts.RELANCE = abonnements.filter((a) => a.logsRelance[0]).length;

  const filtres: { key: string; label: string }[] = [
    { key: "tous", label: "Tous" },
    { key: "ACTIF", label: "Actifs" },
    { key: "RELANCE", label: "À relancer" },
    { key: "TOLERANCE", label: "Tolérance" },
    { key: "COUPE", label: "Coupés" },
    { key: "EXPIRE", label: "Expirés" },
  ];

  const lignes = abonnements.filter((a) => {
    if (filtre === "tous") return true;
    if (filtre === "RELANCE") return !!a.logsRelance[0];
    return a.statut === filtre;
  });

  return (
    <div className="flex flex-col">
      <div className="mb-4.5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="mb-0.5 text-[23px] font-extrabold tracking-tight">Abonnés</h1>
          <p className="text-[13.5px] text-kola-muted">
            {lignes.length} abonné(s) affiché(s) sur {abonnements.length}
          </p>
        </div>
      </div>

      <div className="mb-3.5 flex flex-wrap gap-1.5">
        {filtres.map((f) => {
          const active = filtre === f.key;
          const href = f.key === "tous" ? "/dashboard/abonnes" : `/dashboard/abonnes?statut=${f.key}`;
          return (
            <Link
              key={f.key}
              href={href}
              className={
                "rounded-lg border px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors " +
                (active
                  ? "border-transparent bg-kola-accent text-white"
                  : "border-kola-border-dark/60 bg-white text-kola-muted hover:border-kola-border-dark")
              }
            >
              {f.label} <span className="font-bold opacity-60">{counts[f.key] ?? 0}</span>
            </Link>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-2xl border border-kola-border bg-white">
        <div className="grid grid-cols-[1.5fr_1fr_1.2fr_1fr_1.4fr] gap-3 border-b border-kola-border bg-[#faf7ef] px-4.5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#8b8474]">
          <div>Abonné</div>
          <div>Statut</div>
          <div>Échéance</div>
          <div>Dernier paiement</div>
          <div className="text-right">Actions</div>
        </div>
        {lignes.map((a) => {
          const relance = a.logsRelance[0];
          const message = `Salut ! Ton acces ${a.offre.nom} expire ${
            relance?.type === "J_PLUS_7" ? "" : "dans 3 jours"
          }.\nRenouvelle ici : ${baseUrl}/pay/${a.lienPaiement}`;
          const st = STATUT_STYLE[a.statut];
          return (
            <div
              key={a.id}
              className="grid grid-cols-[1.5fr_1fr_1.2fr_1fr_1.4fr] items-center gap-3 border-b border-[#f4efe4] px-4.5 py-3 last:border-b-0 hover:bg-[#fbf9f3]"
            >
              <div className="min-w-0">
                <div className="font-mono text-[13px] font-bold">
                  {a.abonne.identifiantExterne}
                </div>
                <div className="text-[11.5px] text-kola-muted-light">{a.offre.nom}</div>
              </div>
              <div>
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-bold"
                  style={{ background: st.bg, color: st.fg }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: st.fg }} />
                  {STATUT_LABEL[a.statut]}
                </span>
              </div>
              <div className="text-sm font-semibold tabular-nums">
                {a.dateEcheance ? new Date(a.dateEcheance).toLocaleDateString("fr-FR") : "-"}
              </div>
              <div className="text-sm text-kola-muted tabular-nums">
                {a.transactions[0]
                  ? new Date(a.transactions[0].recuLe).toLocaleDateString("fr-FR")
                  : "-"}
              </div>
              <div className="flex justify-end gap-1.5">
                {relance && <CopyButton message={message} />}
              </div>
            </div>
          );
        })}
        <div className="flex items-center justify-between px-4.5 py-3 text-xs text-kola-muted-light">
          <span>{lignes.length} ligne(s)</span>
          <span>Statut recalculé par le cron quotidien</span>
        </div>
      </div>
    </div>
  );
}
