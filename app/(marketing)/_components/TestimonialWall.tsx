import Link from "next/link";
import { Button } from "@/components/ui/button";

const MUR = [
  { citation: "Je n'ai plus jamais raté un renouvellement.", auteur: "M. Fotso", role: "App de streaming musical" },
  { citation: "Mise en place en une après-midi, vraiment.", auteur: "A. Ngo", role: "App d'apprentissage" },
  { citation: "Les relances automatiques ont doublé mon taux de renouvellement.", auteur: "R. Biya", role: "App fitness" },
  { citation: "Enfin conforme Play Store sans y penser.", auteur: "S. Talla", role: "App de recettes premium" },
  { citation: "Le SDK tient en une ligne. Le reste est invisible.", auteur: "J. Ateba", role: "App de podcasts" },
  { citation: "Kola facture aussi peu qu'on facture nous-mêmes.", auteur: "L. Mbida", role: "App d'actualités" },
];

export function TestimonialWall() {
  return (
    <section id="temoignages" className="bg-kola-cream-light px-5 py-16">
      <div className="mx-auto max-w-5xl">
        <h2 className="mb-8 text-center text-2xl font-extrabold tracking-tight text-kola-text md:text-3xl">
          Le mur de l&apos;amour
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {MUR.map((t) => (
            <div key={t.auteur} className="rounded-2xl border border-kola-border bg-white p-5">
              <p className="mb-3 text-sm leading-relaxed text-kola-text">&ldquo;{t.citation}&rdquo;</p>
              <div className="flex items-center gap-2">
                <span className="h-7 w-7 rounded-full bg-kola-forest/15" />
                <div className="text-xs">
                  <div className="font-bold text-kola-text">{t.auteur}</div>
                  <div className="text-kola-muted-light">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-9 text-center">
          <Button asChild size="lg" className="rounded-full px-7">
            <Link href="/inscription">Commencer gratuitement</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
