// Recuperation/generation instantanee du lien de paiement d'un abonne a partir de son
// numero (cf. kola-automatisation-acces-premium-cahier-des-charges.md §3.4). Route interne,
// protegee par la session Better Auth du dashboard, jamais appelee par l'app mobile.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { contexteTenant, TenantAuthError } from "@/lib/tenant";
import { obtenirOuCreerAbonnement, OffreInconnueError } from "@/lib/abonnement";

const querySchema = z.object({
  identifiantExterne: z.string().min(1),
  offre: z.string().min(1),
});

export async function GET(req: Request) {
  let ctx;
  try {
    ctx = await contexteTenant();
  } catch (e) {
    if (e instanceof TenantAuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }

  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse({
    identifiantExterne: searchParams.get("identifiantExterne"),
    offre: searchParams.get("offre"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Requete invalide" }, { status: 400 });
  }
  const { identifiantExterne, offre: offreSlug } = parsed.data;

  const abonneExistaitDeja = await prisma.abonne.findUnique({
    where: { tenantId_identifiantExterne: { tenantId: ctx.tenantId, identifiantExterne } },
  });

  let abonnement;
  try {
    abonnement = await obtenirOuCreerAbonnement(ctx.tenantId, identifiantExterne, offreSlug);
  } catch (e) {
    if (e instanceof OffreInconnueError) {
      return NextResponse.json({ error: "Offre introuvable" }, { status: 404 });
    }
    throw e;
  }

  const origine = new URL(req.url).origin;

  return NextResponse.json({
    lienPaiement: `${origine}/pay/${abonnement.lienPaiement}`,
    statutActuel: abonnement.statut,
    abonneExistaitDeja: !!abonneExistaitDeja,
  });
}
