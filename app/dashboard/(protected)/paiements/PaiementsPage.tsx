"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

type Transaction = {
  id: string;
  reference: string;
  provider: string;
  montant: number;
  statut: string;
  recuLe: string;
  abonnement: { abonne: { identifiantExterne: string }; offre: { nom: string } };
};

const STYLE: Record<string, "default" | "secondary" | "destructive"> = {
  REUSSIE: "default",
  EN_ATTENTE: "secondary",
  ECHOUEE: "destructive",
};

export function PaiementsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filtre, setFiltre] = useState("");
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    setChargement(true);
    fetch(`/api/admin/paiements${filtre ? `?statut=${filtre}` : ""}`)
      .then((r) => r.json())
      .then((data) => setTransactions(data.transactions ?? []))
      .finally(() => setChargement(false));
  }, [filtre]);

  const filtres = [
    { key: "", label: "Tous" },
    { key: "REUSSIE", label: "Réussis" },
    { key: "EN_ATTENTE", label: "En attente" },
    { key: "ECHOUEE", label: "Échoués" },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[23px] font-extrabold tracking-tight">Paiements</h1>
        <p className="text-[13.5px] text-kola-muted">Historique des transactions, tous prestataires confondus.</p>
      </div>

      <div className="flex gap-1.5">
        {filtres.map((f) => (
          <button
            key={f.key}
            onClick={() => setFiltre(f.key)}
            className={
              "rounded-lg border px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors " +
              (filtre === f.key ? "border-transparent bg-kola-accent text-white" : "border-kola-border-dark/60 bg-white text-kola-muted hover:border-kola-border-dark")
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-kola-border bg-white">
        <div className="grid grid-cols-[1.2fr_0.7fr_0.8fr_0.7fr_0.7fr_1fr] gap-3 border-b border-kola-border bg-[#faf7ef] px-4.5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#8b8474]">
          <div>Abonné</div>
          <div>Offre</div>
          <div>Prestataire</div>
          <div>Montant</div>
          <div>Statut</div>
          <div>Reçu le</div>
        </div>
        {!chargement && transactions.length === 0 && <div className="px-4.5 py-6 text-sm text-kola-muted">Aucune transaction.</div>}
        {transactions.map((t) => (
          <div key={t.id} className="grid grid-cols-[1.2fr_0.7fr_0.8fr_0.7fr_0.7fr_1fr] items-center gap-3 border-b border-[#f4efe4] px-4.5 py-3 last:border-b-0">
            <div className="font-mono text-sm">{t.abonnement.abonne.identifiantExterne}</div>
            <div className="text-sm text-kola-muted">{t.abonnement.offre.nom}</div>
            <div className="text-sm text-kola-muted">{t.provider}</div>
            <div className="text-sm font-semibold tabular-nums">{t.montant.toLocaleString("fr-FR")}</div>
            <div>
              <Badge variant={STYLE[t.statut] ?? "secondary"}>{t.statut}</Badge>
            </div>
            <div className="text-sm text-kola-muted tabular-nums">{new Date(t.recuLe).toLocaleDateString("fr-FR")}</div>
          </div>
        ))}
      </div>

      <Link href="/dashboard/abonnes" className="text-xs font-semibold text-kola-accent">
        ← Retour aux abonnés
      </Link>
    </div>
  );
}
