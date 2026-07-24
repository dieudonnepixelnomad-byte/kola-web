// Creation paresseuse de l'Abonnement (cf. kola-automatisation-acces-premium-cahier-des-charges.md §3.2).
// Un seul point d'entree pour /api/v1/subscriptions/status et /api/admin/lien-paiement :
// ne modifie jamais un Abonnement existant, ne cree que ce qui manque.
import { prisma } from "@/lib/prisma";
import type { Abonnement } from "@/lib/generated/prisma/client";

export class OffreInconnueError extends Error {
  constructor(offreSlug: string) {
    super(`Offre inconnue: ${offreSlug}`);
  }
}

async function obtenirOuCreerAbonne(tenantId: string, identifiantExterne: string) {
  return prisma.abonne.upsert({
    where: { tenantId_identifiantExterne: { tenantId, identifiantExterne } },
    update: {},
    create: { tenantId, identifiantExterne },
  });
}

// Mono-tenant/mono-app au MVP : l'appId se deduit du tenant, pas d'ambiguite possible
// (cf. §3.2 du cahier des charges automatisation).
async function resoudreOffre(tenantId: string, offreSlug: string) {
  return prisma.offre.findFirst({ where: { slug: offreSlug, app: { tenantId } } });
}

export async function obtenirOuCreerAbonnement(
  tenantId: string,
  identifiantExterne: string,
  offreSlug: string
): Promise<Abonnement> {
  const abonne = await obtenirOuCreerAbonne(tenantId, identifiantExterne);

  const offre = await resoudreOffre(tenantId, offreSlug);
  if (!offre) throw new OffreInconnueError(offreSlug);

  let abonnement = await prisma.abonnement.findFirst({
    where: { abonneId: abonne.id, offreId: offre.id },
  });

  if (!abonnement) {
    abonnement = await prisma.abonnement.create({
      data: { abonneId: abonne.id, offreId: offre.id, statut: "COUPE" },
    });
  }

  return abonnement;
}
