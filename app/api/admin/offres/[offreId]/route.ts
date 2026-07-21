import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { contexteTenant, exigerRole, TenantAuthError } from "@/lib/tenant";

const patchSchema = z.object({
  nom: z.string().min(1).optional(),
  prix: z.number().int().min(0).optional(),
  actif: z.boolean().optional(),
  configurationId: z.string().nullable().optional(),
});

async function resoudreOffre(offreId: string, tenantId: string) {
  return prisma.offre.findFirst({ where: { id: offreId, app: { tenantId } } });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ offreId: string }> }) {
  const { offreId } = await params;
  let ctx;
  try {
    ctx = await contexteTenant();
    exigerRole(ctx, ["proprietaire", "admin"]);
  } catch (e) {
    if (e instanceof TenantAuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }

  const offre = await resoudreOffre(offreId, ctx.tenantId);
  if (!offre) return NextResponse.json({ error: "Offre introuvable" }, { status: 404 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Requete invalide" }, { status: 400 });

  const updated = await prisma.offre.update({ where: { id: offre.id }, data: parsed.data });
  return NextResponse.json({ id: updated.id });
}
