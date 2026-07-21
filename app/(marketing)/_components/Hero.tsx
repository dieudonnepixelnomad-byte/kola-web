import Link from "next/link";
import { Button } from "@/components/ui/button";

const BENEFICES = ["Renouvellements automatiques", "Relances qui partent seules", "Zéro paiement géré dans l'app"];

export function Hero() {
  return (
    <section className="border-b border-kola-border bg-[radial-gradient(120%_60%_at_50%_0%,#e2f4ea_0%,#f6f2e8_60%)] px-5 pb-20 pt-16 text-center">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-4 text-4xl font-extrabold leading-[1.15] tracking-tight text-kola-text md:text-[52px]">
          Sais toujours qui a payé.
          <br />
          Sans construire un système de paiement.
        </h1>
        <p className="mx-auto mb-6 max-w-[52ch] text-[17px] leading-relaxed text-kola-muted">
          Kola gère l&apos;abonnement Mobile Money de ton app — activation, relances, coupures — pendant que ton app reste
          100% conforme Play Store, sans jamais toucher un franc.
        </p>

        <div className="mb-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {BENEFICES.map((b) => (
            <div key={b} className="flex items-center gap-1.5 text-sm font-semibold text-kola-forest">
              <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-kola-accent text-[10px] text-white">
                ✓
              </span>
              {b}
            </div>
          ))}
        </div>

        <Button asChild size="lg" className="rounded-full px-7 text-base shadow-[0_10px_24px_-10px_#12a05e88]">
          <Link href="/inscription">Commencer gratuitement</Link>
        </Button>

        <div className="mt-8 flex items-center justify-center gap-2.5 text-xs font-semibold text-kola-muted-light">
          <div className="flex -space-x-2">
            {["#0e3b28", "#12a05e", "#9a6206", "#c14a2c"].map((c) => (
              <span key={c} className="h-7 w-7 rounded-full border-2 border-kola-cream-light" style={{ background: c }} />
            ))}
          </div>
          Déjà utilisé par des éditeurs qui n&apos;ont pas de compte marchand Google
        </div>
      </div>
    </section>
  );
}
