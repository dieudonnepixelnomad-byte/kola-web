import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { contexteTenant, TenantAuthError } from "@/lib/tenant";

// Facturation du tenant a Kola lui-meme (dogfooding, §11) : meme mecanisme
// que n'importe quel abonnement, lien de paiement identique.
export async function GET() {
  let ctx;
  try {
    ctx = await contexteTenant();
  } catch (e) {
    if (e instanceof TenantAuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }

  const tenantSysteme = await prisma.tenant.findFirst({ where: { estSysteme: true } });
  if (!tenantSysteme) return NextResponse.json({ abonnement: null });

  const abonneSysteme = await prisma.abonne.findUnique({
    where: { tenantId_identifiantExterne: { tenantId: tenantSysteme.id, identifiantExterne: ctx.tenantId } },
  });
  if (!abonneSysteme) return NextResponse.json({ abonnement: null });

  const abonnement = await prisma.abonnement.findFirst({
    where: { abonneId: abonneSysteme.id },
    include: { offre: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    abonnement: abonnement && {
      statut: abonnement.statut,
      dateEcheance: abonnement.dateEcheance,
      lienPaiement: abonnement.lienPaiement,
      offreNom: abonnement.offre.nom,
      prix: abonnement.offre.prix,
    },
  });
}
