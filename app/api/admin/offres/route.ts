import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { contexteTenant, exigerRole, TenantAuthError } from "@/lib/tenant";
import { enregistrerAction } from "@/lib/journalAudit";

const bodySchema = z.object({
  appId: z.string().min(1),
  nom: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "slug: lettres minuscules, chiffres, tirets uniquement"),
  prix: z.number().int().min(0),
  remisePourcentageAnnuel: z.number().min(0).max(100).default(0),
  devise: z.string().default("XAF"),
  periodiciteJours: z.number().int().min(1).default(30),
  toleranceJours: z.number().int().min(0).default(3),
  configurationId: z.string().nullable().optional(),
});

export async function GET() {
  let ctx;
  try {
    ctx = await contexteTenant();
  } catch (e) {
    if (e instanceof TenantAuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }

  const offres = await prisma.offre.findMany({
    where: { app: { tenantId: ctx.tenantId } },
    select: { id: true, slug: true, nom: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ offres });
}

export async function POST(req: Request) {
  let ctx;
  try {
    ctx = await contexteTenant();
    exigerRole(ctx, ["proprietaire", "admin"]);
  } catch (e) {
    if (e instanceof TenantAuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Requete invalide" }, { status: 400 });

  const app = await prisma.app.findFirst({ where: { id: parsed.data.appId, tenantId: ctx.tenantId } });
  if (!app) return NextResponse.json({ error: "App introuvable" }, { status: 404 });

  if (parsed.data.configurationId) {
    const config = await prisma.configurationPaiement.findFirst({
      where: { id: parsed.data.configurationId, tenantId: ctx.tenantId },
    });
    if (!config) return NextResponse.json({ error: "Configuration de paiement introuvable" }, { status: 400 });
  }

  const prixAnnuel = Math.round(parsed.data.prix * 12 * (1 - parsed.data.remisePourcentageAnnuel / 100));

  const offre = await prisma.offre.create({
    data: {
      appId: app.id,
      nom: parsed.data.nom,
      slug: parsed.data.slug,
      prix: parsed.data.prix,
      prixAnnuel,
      devise: parsed.data.devise,
      periodiciteJours: parsed.data.periodiciteJours,
      toleranceJours: parsed.data.toleranceJours,
      configurationId: parsed.data.configurationId ?? null,
    },
  });

  await enregistrerAction(ctx, { action: "offre.creee", cible: offre.id, meta: { slug: offre.slug } });
  return NextResponse.json({ id: offre.id }, { status: 201 });
}
