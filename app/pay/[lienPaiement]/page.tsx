import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PayForm } from "./PayForm";

export default async function PayPage({
  params,
}: {
  params: Promise<{ lienPaiement: string }>;
}) {
  const { lienPaiement } = await params;

  const abonnement = await prisma.abonnement.findUnique({
    where: { lienPaiement },
    include: { offre: true, abonne: true },
  });

  if (!abonnement) {
    notFound();
  }

  const { offre, abonne } = abonnement;

  return (
    <main
      className="flex min-h-screen flex-col items-center px-5 pb-10 pt-6.5"
      style={{
        background:
          "radial-gradient(120% 60% at 50% 0%, #e7f4ec 0%, #f2ede1 55%)",
      }}
    >
      <div className="w-[390px] max-w-full rounded-[44px] bg-[#0e2a1e] p-2.5 shadow-[0_40px_80px_-30px_rgba(14,42,30,.6)]">
        <div className="relative min-h-[600px] overflow-hidden rounded-[34px] bg-[#f7f4ec]">
          <div className="flex items-center justify-between px-6.5 pb-2 pt-3.5 text-[13px] font-bold text-kola-text">
            <span>9:41</span>
            <span className="tracking-widest">● ● ●  5G ▮</span>
          </div>

          <div className="flex items-center gap-2.5 px-5.5 pb-4 pt-1.5">
            <div className="flex h-6.5 w-6.5 items-center justify-center rounded-lg bg-kola-accent text-[15px] font-extrabold text-kola-forest-dark">
              k
            </div>
            <span className="text-base font-extrabold tracking-tight">Kola</span>
            <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-kola-actif-bg px-2.5 py-1 text-[11px] font-bold text-kola-actif-fg">
              <span className="h-1.5 w-1.5 rounded-full bg-kola-actif-fg" />
              Sécurisé
            </span>
          </div>

          <div className="px-5.5 pb-6.5">
            <PayForm
              lienPaiement={lienPaiement}
              telephoneInitial={abonne.telephone ?? ""}
              offreNom={offre.nom}
              prix={offre.prix}
              devise={offre.devise}
              periodiciteJours={offre.periodiciteJours}
            />
          </div>
        </div>
      </div>
      <p className="mt-5.5 max-w-[34ch] text-center text-xs text-kola-muted-light">
        Cette page s&apos;ouvre depuis le lien WhatsApp — aucun compte à
        créer, posséder le lien suffit.
      </p>
    </main>
  );
}
