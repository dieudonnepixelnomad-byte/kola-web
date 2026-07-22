"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FONCTIONNALITES: Record<string, string[]> = {
  decouverte: ["Jusqu'à 50 abonnés actifs", "SDK Flutter", "Cron quotidien automatique", "1 app, prestataire Campay ou MeSomb"],
  standard: ["Jusqu'à 500 abonnés actifs", "Relances automatiques WhatsApp/SMS/email", "Multi-app", "Export CSV"],
  croissance: ["Jusqu'à 2000 abonnés actifs", "Multi-prestataire par offre", "Webhooks sortants", "API publique"],
  echelle: ["Abonnés illimités", "Tout Croissance", "Équipe illimitée", "Support prioritaire"],
};

type Offre = { nom: string; slug: string; prix: number; prixAnnuel: number | null; devise: string };

export function Pricing({ offres }: { offres: Offre[] }) {
  const [periodicite, setPeriodicite] = useState<"mensuel" | "annuel">("mensuel");
  const misEnAvant = offres.find((o) => o.slug === "standard")?.slug;

  return (
    <section id="tarifs" className="border-b border-kola-border bg-kola-cream-light px-5 py-16">
      <div className="mx-auto max-w-5xl text-center">
        <Badge className="mb-3 rounded-full bg-kola-accent/15 px-3 py-1 text-kola-accent hover:bg-kola-accent/15">
          Gratuit pour démarrer
        </Badge>
        <h2 className="mb-2 text-2xl font-extrabold tracking-tight text-kola-text md:text-3xl">Gagne en liberté</h2>
        <p className="mb-6 text-kola-muted">Un forfait fixe selon ta taille — jamais une commission sur ton chiffre.</p>

        <div className="mb-10 inline-flex items-center rounded-full border border-kola-border bg-white p-1">
          {(["mensuel", "annuel"] as const).map((valeur) => (
            <button
              key={valeur}
              type="button"
              onClick={() => setPeriodicite(valeur)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
                periodicite === valeur ? "bg-kola-forest text-white" : "text-kola-muted hover:text-kola-text"
              )}
            >
              {valeur === "mensuel" ? "Mensuel" : "Annuel"}
              {valeur === "annuel" && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[11px] font-bold",
                    periodicite === "annuel" ? "bg-kola-accent text-white" : "bg-kola-accent/15 text-kola-accent"
                  )}
                >
                  -40%
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="grid gap-5 md:grid-cols-4">
          {offres.map((offre) => {
            const enAvant = offre.slug === misEnAvant;
            const gratuit = offre.prix === 0;
            const prixAffiche =
              periodicite === "annuel" && !gratuit && offre.prixAnnuel != null ? offre.prixAnnuel : offre.prix;
            const suffixe = gratuit ? "" : periodicite === "annuel" ? "/an" : "/mois";

            return (
              <div
                key={offre.slug}
                className={cn(
                  "flex flex-col rounded-2xl border p-6 text-left",
                  enAvant ? "border-kola-accent bg-kola-forest text-white shadow-xl" : "border-kola-border bg-white"
                )}
              >
                <div className={cn("mb-1 text-sm font-bold", enAvant ? "text-white" : "text-kola-text")}>{offre.nom}</div>
                <div className={cn("mb-1 text-3xl font-extrabold", enAvant ? "text-white" : "text-kola-text")}>
                  {gratuit ? "Gratuit" : `${prixAffiche.toLocaleString("fr-FR")} F`}
                  {!gratuit && <span className="text-sm font-semibold opacity-70">{suffixe}</span>}
                </div>
                {!gratuit && periodicite === "annuel" && (
                  <div className={cn("mb-3 text-xs font-semibold", enAvant ? "text-[#dcefe4]" : "text-kola-muted-light")}>
                    au lieu de {(offre.prix * 12).toLocaleString("fr-FR")} F/an
                  </div>
                )}
                {(gratuit || periodicite === "mensuel") && <div className="mb-4" />}
                <ul className={cn("mb-6 flex flex-1 flex-col gap-2 text-sm", enAvant ? "text-[#dcefe4]" : "text-kola-muted")}>
                  {(FONCTIONNALITES[offre.slug] ?? []).map((f) => (
                    <li key={f} className="flex gap-2">
                      <span className={enAvant ? "text-kola-accent" : "text-kola-accent"}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Button asChild variant={enAvant ? "default" : "outline"} className={cn("rounded-full", enAvant && "bg-kola-accent hover:bg-kola-accent-hover")}>
                  <Link href="/inscription">Commencer</Link>
                </Button>
              </div>
            );
          })}
        </div>
        <p className="mt-6 text-xs font-semibold text-kola-muted-light">Aucune carte requise · change de palier automatiquement</p>
      </div>
    </section>
  );
}
