import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signerToken } from "@/lib/jwt";
import { obtenirOuCreerAbonnement, OffreInconnueError } from "@/lib/abonnement";

const querySchema = z.object({
  cle: z.string().min(1),
  identifiantExterne: z.string().min(1),
  offre: z.string().min(1),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse({
    cle: searchParams.get("cle"),
    identifiantExterne: searchParams.get("identifiantExterne"),
    offre: searchParams.get("offre"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Requete invalide" }, { status: 400 });
  }
  const { cle, identifiantExterne, offre: offreSlug } = parsed.data;

  const app = await prisma.app.findUnique({ where: { cleApiPublique: cle } });
  if (!app) {
    return NextResponse.json({ error: "Cle invalide" }, { status: 401 });
  }
  const tenantId = app.tenantId;

  let abonnement;
  try {
    abonnement = await obtenirOuCreerAbonnement(tenantId, identifiantExterne, offreSlug);
  } catch (e) {
    if (e instanceof OffreInconnueError) {
      return NextResponse.json({ error: "Offre introuvable" }, { status: 404 });
    }
    throw e;
  }

  const actif = abonnement.statut === "ACTIF" || abonnement.statut === "TOLERANCE";
  const dateEcheance = abonnement.dateEcheance?.toISOString() ?? null;

  const token = signerToken({
    identifiantExterne,
    offreSlug,
    tenantId,
    actif,
    dateEcheance,
  });

  return NextResponse.json({
    actif,
    statut: abonnement.statut,
    dateEcheance,
    token,
  });
}
