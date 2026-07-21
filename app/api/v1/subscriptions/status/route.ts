import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signerToken } from "@/lib/jwt";

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

  const abonne = await prisma.abonne.upsert({
    where: { tenantId_identifiantExterne: { tenantId, identifiantExterne } },
    update: {},
    create: { tenantId, identifiantExterne },
  });

  const offre = await prisma.offre.findFirst({
    where: { slug: offreSlug, appId: app.id },
  });
  if (!offre) {
    return NextResponse.json({ error: "Offre introuvable" }, { status: 404 });
  }

  let abonnement = await prisma.abonnement.findFirst({
    where: { abonneId: abonne.id, offreId: offre.id },
    orderBy: { createdAt: "desc" },
  });

  if (!abonnement) {
    abonnement = await prisma.abonnement.create({
      data: { abonneId: abonne.id, offreId: offre.id, statut: "COUPE" },
    });
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
