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

export function Pricing({
  offres,
}: {
  offres: { nom: string; slug: string; prix: number; devise: string }[];
}) {
  const misEnAvant = offres.find((o) => o.slug === "standard")?.slug;

  return (
    <section id="tarifs" className="border-b border-kola-border bg-kola-cream-light px-5 py-16">
      <div className="mx-auto max-w-5xl text-center">
        <Badge className="mb-3 rounded-full bg-kola-accent/15 px-3 py-1 text-kola-accent hover:bg-kola-accent/15">
          Gratuit pour démarrer
        </Badge>
        <h2 className="mb-2 text-2xl font-extrabold tracking-tight text-kola-text md:text-3xl">Gagne en liberté</h2>
        <p className="mb-10 text-kola-muted">Un forfait fixe selon ta taille — jamais une commission sur ton chiffre.</p>

        <div className="grid gap-5 md:grid-cols-4">
          {offres.map((offre) => {
            const enAvant = offre.slug === misEnAvant;
            return (
              <div
                key={offre.slug}
                className={cn(
                  "flex flex-col rounded-2xl border p-6 text-left",
                  enAvant ? "border-kola-accent bg-kola-forest text-white shadow-xl" : "border-kola-border bg-white"
                )}
              >
                <div className={cn("mb-1 text-sm font-bold", enAvant ? "text-white" : "text-kola-text")}>{offre.nom}</div>
                <div className={cn("mb-4 text-3xl font-extrabold", enAvant ? "text-white" : "text-kola-text")}>
                  {offre.prix === 0 ? "Gratuit" : `${offre.prix.toLocaleString("fr-FR")} F`}
                  {offre.prix > 0 && <span className="text-sm font-semibold opacity-70">/mois</span>}
                </div>
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
