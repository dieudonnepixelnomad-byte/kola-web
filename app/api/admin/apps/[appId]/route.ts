import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { contexteTenant, exigerRole, TenantAuthError } from "@/lib/tenant";
import { enregistrerAction } from "@/lib/journalAudit";

export async function GET(_req: Request, { params }: { params: Promise<{ appId: string }> }) {
  const { appId } = await params;
  let ctx;
  try {
    ctx = await contexteTenant();
  } catch (e) {
    if (e instanceof TenantAuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }

  const app = await prisma.app.findFirst({
    where: { id: appId, tenantId: ctx.tenantId },
    include: { offres: { orderBy: { createdAt: "desc" } } },
  });
  if (!app) return NextResponse.json({ error: "App introuvable" }, { status: 404 });

  const { cleApiSecreteHash: _hash, ...appSansHash } = app;
  return NextResponse.json({ app: appSansHash });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ appId: string }> }) {
  const { appId } = await params;
  let ctx;
  try {
    ctx = await contexteTenant();
    exigerRole(ctx, ["proprietaire", "admin"]);
  } catch (e) {
    if (e instanceof TenantAuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }

  const app = await prisma.app.findFirst({ where: { id: appId, tenantId: ctx.tenantId }, include: { offres: { select: { id: true } } } });
  if (!app) return NextResponse.json({ error: "App introuvable" }, { status: 404 });
  if (app.offres.length > 0) {
    return NextResponse.json({ error: "Supprime d'abord les offres de cette app" }, { status: 409 });
  }

  await prisma.app.delete({ where: { id: appId } });
  await enregistrerAction(ctx, { action: "app.supprimee", cible: appId, meta: { nom: app.nom } });

  return NextResponse.json({ ok: true });
}
