// Kola facture ses propres tenants avec Kola (§11). Reevalue le palier de
// chaque tenant selon son nombre d'abonnes actifs, et synchronise le statut
// de plateforme denormalise depuis l'abonnement dogfooding correspondant.
import { prisma } from "./prisma";

const PALIERS: { slug: string; plafond: number }[] = [
  { slug: "decouverte", plafond: 50 },
  { slug: "standard", plafond: 500 },
  { slug: "croissance", plafond: 2000 },
  { slug: "echelle", plafond: Infinity },
];

export function tierPourNombreAbonnes(n: number): string {
  return PALIERS.find((p) => n <= p.plafond)?.slug ?? "echelle";
}

export async function synchroniserDogfooding() {
  const tenantSysteme = await prisma.tenant.findFirst({ where: { estSysteme: true } });
  if (!tenantSysteme) return { traites: 0 };

  const appPlateforme = await prisma.app.findFirst({ where: { tenantId: tenantSysteme.id } });
  if (!appPlateforme) return { traites: 0 };

  const offresParSlug = new Map(
    (await prisma.offre.findMany({ where: { appId: appPlateforme.id } })).map((o) => [o.slug, o])
  );

  const tenants = await prisma.tenant.findMany({ where: { estSysteme: false } });
  let traites = 0;

  for (const tenant of tenants) {
    const nombreAbonnesActifs = await prisma.abonnement.count({
      where: { statut: { in: ["ACTIF", "TOLERANCE"] }, abonne: { tenantId: tenant.id } },
    });

    const abonneSysteme = await prisma.abonne.findUnique({
      where: { tenantId_identifiantExterne: { tenantId: tenantSysteme.id, identifiantExterne: tenant.id } },
    });
    if (!abonneSysteme) continue;

    const abonnementDogfooding = await prisma.abonnement.findFirst({
      where: { abonneId: abonneSysteme.id },
      include: { offre: true },
      orderBy: { createdAt: "desc" },
    });
    if (!abonnementDogfooding) continue;

    const tierCible = tierPourNombreAbonnes(nombreAbonnesActifs);
    const offreCible = offresParSlug.get(tierCible);
    if (offreCible && abonnementDogfooding.offre.slug !== tierCible) {
      await prisma.abonnement.update({
        where: { id: abonnementDogfooding.id },
        data: { offreId: offreCible.id },
      });
    }

    if (tenant.statutPlateforme !== abonnementDogfooding.statut) {
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { statutPlateforme: abonnementDogfooding.statut },
      });
    }

    traites++;
  }

  return { traites };
}
