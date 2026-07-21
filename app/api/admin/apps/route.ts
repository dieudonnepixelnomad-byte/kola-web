import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { genererCleSecrete, hashSecret } from "@/lib/crypto";
import { contexteTenant, exigerRole, TenantAuthError } from "@/lib/tenant";
import { enregistrerAction } from "@/lib/journalAudit";

const bodySchema = z.object({
  nom: z.string().min(1),
  plateforme: z.enum(["android", "ios"]).default("android"),
});

export async function GET() {
  let ctx;
  try {
    ctx = await contexteTenant();
  } catch (e) {
    if (e instanceof TenantAuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }

  const apps = await prisma.app.findMany({
    where: { tenantId: ctx.tenantId },
    orderBy: { createdAt: "desc" },
    include: { offres: { select: { id: true, nom: true, slug: true, actif: true } } },
  });

  return NextResponse.json({ apps });
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

  const cleSecrete = genererCleSecrete();
  const app = await prisma.app.create({
    data: {
      tenantId: ctx.tenantId,
      nom: parsed.data.nom,
      plateforme: parsed.data.plateforme,
      cleApiSecreteHash: hashSecret(cleSecrete),
      cleApiSecreteIndice: cleSecrete.slice(-6),
    },
  });

  await enregistrerAction(ctx, { action: "app.creee", cible: app.id, meta: { nom: app.nom } });

  // La cle secrete n'est jamais retournee que sur cette seule reponse.
  return NextResponse.json({ id: app.id, cleApiPublique: app.cleApiPublique, cleApiSecrete: cleSecrete }, { status: 201 });
}
