import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { contexteTenant, exigerRole, TenantAuthError } from "@/lib/tenant";

const patchSchema = z.object({ actif: z.boolean().optional() });

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

  const webhook = await prisma.webhookSortant.findFirst({ where: { id, tenantId: ctx.tenantId } });
  if (!webhook) return NextResponse.json({ error: "Webhook introuvable" }, { status: 404 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Requete invalide" }, { status: 400 });

  const updated = await prisma.webhookSortant.update({ where: { id: webhook.id }, data: parsed.data });
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

  const webhook = await prisma.webhookSortant.findFirst({ where: { id, tenantId: ctx.tenantId } });
  if (!webhook) return NextResponse.json({ error: "Webhook introuvable" }, { status: 404 });

  await prisma.webhookSortant.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
