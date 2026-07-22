import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { genererClePublique } from "@/lib/crypto";
import { contexteTenant, exigerRole, TenantAuthError } from "@/lib/tenant";
import { enregistrerAction } from "@/lib/journalAudit";

export async function POST(_req: Request, { params }: { params: Promise<{ appId: string }> }) {
  const { appId } = await params;
  let ctx;
  try {
    ctx = await contexteTenant();
    exigerRole(ctx, ["proprietaire", "admin"]);
  } catch (e) {
    if (e instanceof TenantAuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }

  const app = await prisma.app.findFirst({ where: { id: appId, tenantId: ctx.tenantId } });
  if (!app) return NextResponse.json({ error: "App introuvable" }, { status: 404 });

  const cleApiPublique = genererClePublique();
  await prisma.app.update({ where: { id: appId }, data: { cleApiPublique } });
  await enregistrerAction(ctx, { action: "app.cle_publique_regeneree", cible: appId });

  return NextResponse.json({ cleApiPublique });
}
