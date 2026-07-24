import { headers } from "next/headers";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyButton } from "./CopyButton";
import { RechercheLienPaiement } from "./RechercheLienPaiement";

type Abonnement = {
  id: string;
  statut: "ACTIF" | "TOLERANCE" | "COUPE" | "EXPIRE";
  dateEcheance: string | null;
  lienPaiement: string;
  abonne: { identifiantExterne: string };
  offre: { nom: string };
  transactions: { recuLe: string; statut: string }[];
  logsRelance: { type: "J_MOINS_3" | "J_ECHEANCE" | "J_PLUS_7"; envoyeLe: string }[];
};

const STATUT_VARIANT: Record<Abonnement["statut"], "default" | "secondary" | "destructive" | "outline"> = {
  ACTIF: "default",
  TOLERANCE: "secondary",
  COUPE: "destructive",
  EXPIRE: "outline",
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

async function getOffreSlugParDefaut(): Promise<string | null> {
  const h = await headers();
  const host = h.get("host");
  const protocole = process.env.NODE_ENV === "production" ? "https" : "http";
  const res = await fetch(`${protocole}://${host}/api/admin/offres`, {
    headers: { cookie: h.get("cookie") ?? "" },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.offres[0]?.slug ?? null;
}

export default async function AbonnesPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string }>;
}) {
  const { statut } = await searchParams;
  const [abonnements, offreSlugParDefaut] = await Promise.all([getAbonnements(), getOffreSlugParDefaut()]);

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
        <Button asChild variant="outline" size="sm">
          <a href="/api/admin/export" download>
            Exporter en CSV
          </a>
        </Button>
      </div>

      {offreSlugParDefaut && <RechercheLienPaiement offreSlug={offreSlugParDefaut} />}

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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Abonné</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Échéance</TableHead>
              <TableHead>Dernier paiement</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lignes.map((a) => {
              const relance = a.logsRelance[0];
              const message = `Salut ! Ton acces ${a.offre.nom} expire ${
                relance?.type === "J_PLUS_7" ? "" : "dans 3 jours"
              }.\nRenouvelle ici : /pay/${a.lienPaiement}`;
              return (
                <TableRow key={a.id}>
                  <TableCell>
                    <div className="font-mono text-[13px] font-bold">{a.abonne.identifiantExterne}</div>
                    <div className="text-[11.5px] text-kola-muted-light">{a.offre.nom}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUT_VARIANT[a.statut]}>{STATUT_LABEL[a.statut]}</Badge>
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {a.dateEcheance ? new Date(a.dateEcheance).toLocaleDateString("fr-FR") : "-"}
                  </TableCell>
                  <TableCell className="tabular-nums text-kola-muted">
                    {a.transactions[0] ? new Date(a.transactions[0].recuLe).toLocaleDateString("fr-FR") : "-"}
                  </TableCell>
                  <TableCell className="text-right">{relance && <CopyButton message={message} />}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between px-4.5 py-3 text-xs text-kola-muted-light">
          <span>{lignes.length} ligne(s)</span>
          <span>Statut recalculé par le cron quotidien</span>
        </div>
      </div>
    </div>
  );
}
