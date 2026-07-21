import Link from "next/link";
import { Button } from "@/components/ui/button";

const ETAPES = [
  { titre: "Connecte un prestataire", description: "Campay ou MeSomb, en sandbox ou en prod. Deux minutes, aucun code." },
  { titre: "Colle le SDK dans ton app", description: "Une ligne : Kola.isActive('premium', identifiantExterne: numero)." },
  { titre: "Laisse tourner", description: "Kola active, relance, coupe et réactive tout seul, chaque nuit." },
];

export function TroisEtapes() {
  return (
    <section className="border-b border-kola-border bg-white px-5 py-16">
      <div className="mx-auto max-w-4xl text-center">
        <h2 className="mb-10 text-2xl font-extrabold tracking-tight text-kola-text md:text-3xl">
          Ta solution, expliquée en toute simplicité
        </h2>
        <div className="grid gap-6 text-left md:grid-cols-3">
          {ETAPES.map((e, i) => (
            <div key={e.titre} className="rounded-2xl border border-kola-border bg-kola-cream-light p-6">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-kola-accent text-sm font-extrabold text-white">
                {i + 1}
              </div>
              <h3 className="mb-1.5 font-bold text-kola-text">{e.titre}</h3>
              <p className="text-sm leading-relaxed text-kola-muted">{e.description}</p>
            </div>
          ))}
        </div>
        <Button asChild size="lg" className="mt-9 rounded-full px-7">
          <Link href="/inscription">Commencer gratuitement</Link>
        </Button>
        <p className="mt-3 text-xs font-semibold text-kola-muted-light">✓ Aucune expérience requise · gratuit jusqu&apos;à 50 abonnés</p>
      </div>
    </section>
  );
}
