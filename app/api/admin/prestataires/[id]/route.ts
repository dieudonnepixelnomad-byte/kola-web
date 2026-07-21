import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { contexteTenant, exigerRole, TenantAuthError } from "@/lib/tenant";
import { getPrestataire } from "@/lib/paiement/factory";

const patchSchema = z.object({
  nom: z.string().min(1).optional(),
  actif: z.boolean().optional(),
  parDefaut: z.boolean().optional(),
  tester: z.boolean().optional(),
});

function resoudreConfig(id: string, tenantId: string) {
  return prisma.configurationPaiement.findFirst({ where: { id, tenantId } });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let ctx;
  try {
    ctx = await contexteTenant();
    exigerRole(ctx, ["proprietaire", "admin"]);
  } catch (e) {
    if (e instanceof TenantAuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Requete invalide" }, { status: 400 });

  const config = await resoudreConfig(id, ctx.tenantId);
  if (!config) {
    return NextResponse.json({ error: "Configuration introuvable" }, { status: 404 });
  }

  if (parsed.data.tester) {
    const ok = await getPrestataire(config).tester();
    await prisma.configurationPaiement.update({
      where: { id: config.id },
      data: ok ? { verifieLe: new Date() } : {},
    });
    return NextResponse.json({ ok });
  }

  const { nom, actif, parDefaut } = parsed.data;
  const updated = await prisma.$transaction(async (tx) => {
    if (parDefaut) {
      await tx.configurationPaiement.updateMany({
        where: { tenantId: ctx.tenantId, parDefaut: true, id: { not: config.id } },
        data: { parDefaut: false },
      });
    }
    return tx.configurationPaiement.update({
      where: { id: config.id },
      data: { ...(nom !== undefined ? { nom } : {}), ...(actif !== undefined ? { actif } : {}), ...(parDefaut !== undefined ? { parDefaut } : {}) },
    });
  });

  return NextResponse.json({ id: updated.id });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let ctx;
  try {
    ctx = await contexteTenant();
    exigerRole(ctx, ["proprietaire", "admin"]);
  } catch (e) {
    if (e instanceof TenantAuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }

  const config = await resoudreConfig(id, ctx.tenantId);
  if (!config) {
    return NextResponse.json({ error: "Configuration introuvable" }, { status: 404 });
  }

  await prisma.configurationPaiement.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
