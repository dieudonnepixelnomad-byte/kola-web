import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { contexteTenant, TenantAuthError } from "@/lib/tenant";

export async function GET() {
  let ctx;
  try {
    ctx = await contexteTenant();
  } catch (e) {
    if (e instanceof TenantAuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }

  const [prestataire, app, offre, paiementReussi] = await Promise.all([
    prisma.configurationPaiement.findFirst({ where: { tenantId: ctx.tenantId, actif: true } }),
    prisma.app.findFirst({ where: { tenantId: ctx.tenantId } }),
    prisma.offre.findFirst({ where: { app: { tenantId: ctx.tenantId } } }),
    prisma.transaction.findFirst({
      where: { statut: "REUSSIE", abonnement: { offre: { app: { tenantId: ctx.tenantId } } } },
    }),
  ]);

  return NextResponse.json({
    prestataire: !!prestataire,
    app: !!app,
    offre: !!offre,
    paiementReussi: !!paiementReussi,
  });
}
