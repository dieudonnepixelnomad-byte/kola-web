import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { contexteApiPublique, PublicApiAuthError } from "@/lib/publicApiAuth";

const querySchema = z.object({
  identifiantExterne: z.string().min(1),
  offre: z.string().min(1),
});

// Equivalent server-to-server du statut consomme par le SDK (§9), sans JWT
// -- authentifie par cle secrete plutot que cle publique.
export async function GET(req: Request) {
  let ctx;
  try {
    ctx = await contexteApiPublique(req);
  } catch (e) {
    if (e instanceof PublicApiAuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }

  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse({
    identifiantExterne: searchParams.get("identifiantExterne"),
    offre: searchParams.get("offre"),
  });
  if (!parsed.success) return NextResponse.json({ error: "Requete invalide" }, { status: 400 });

  const offre = await prisma.offre.findFirst({ where: { appId: ctx.appId, slug: parsed.data.offre } });
  if (!offre) return NextResponse.json({ error: "Offre introuvable" }, { status: 404 });

  const abonne = await prisma.abonne.findUnique({
    where: { tenantId_identifiantExterne: { tenantId: ctx.tenantId, identifiantExterne: parsed.data.identifiantExterne } },
  });
  if (!abonne) {
    return NextResponse.json({ actif: false, statut: "COUPE", dateEcheance: null });
  }

  const abonnement = await prisma.abonnement.findFirst({
    where: { abonneId: abonne.id, offreId: offre.id },
    orderBy: { createdAt: "desc" },
  });
  if (!abonnement) {
    return NextResponse.json({ actif: false, statut: "COUPE", dateEcheance: null });
  }

  const actif = abonnement.statut === "ACTIF" || abonnement.statut === "TOLERANCE";
  return NextResponse.json({ actif, statut: abonnement.statut, dateEcheance: abonnement.dateEcheance });
}
