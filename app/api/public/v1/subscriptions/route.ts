import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { contexteApiPublique, PublicApiAuthError } from "@/lib/publicApiAuth";

const querySchema = z.object({
  identifiantExterne: z.string().min(1).optional(),
  offre: z.string().min(1).optional(),
});

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
    identifiantExterne: searchParams.get("identifiantExterne") ?? undefined,
    offre: searchParams.get("offre") ?? undefined,
  });
  if (!parsed.success) return NextResponse.json({ error: "Requete invalide" }, { status: 400 });

  const abonnements = await prisma.abonnement.findMany({
    where: {
      abonne: { tenantId: ctx.tenantId, ...(parsed.data.identifiantExterne ? { identifiantExterne: parsed.data.identifiantExterne } : {}) },
      offre: { appId: ctx.appId, ...(parsed.data.offre ? { slug: parsed.data.offre } : {}) },
    },
    include: { abonne: { select: { identifiantExterne: true } }, offre: { select: { slug: true } } },
    take: 200,
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({
    subscriptions: abonnements.map((a) => ({
      identifiantExterne: a.abonne.identifiantExterne,
      offre: a.offre.slug,
      statut: a.statut,
      dateEcheance: a.dateEcheance,
    })),
  });
}
