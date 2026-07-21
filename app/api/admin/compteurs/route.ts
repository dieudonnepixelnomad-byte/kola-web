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

  const groupes = await prisma.abonnement.groupBy({
    by: ["statut"],
    where: { abonne: { tenantId: ctx.tenantId } },
    _count: true,
  });

  const compteurs = { ACTIF: 0, TOLERANCE: 0, COUPE: 0, EXPIRE: 0 };
  for (const g of groupes) {
    compteurs[g.statut] = g._count;
  }

  const aRelancer = await prisma.abonnement.count({
    where: {
      statut: "ACTIF",
      abonne: { tenantId: ctx.tenantId },
      logsRelance: { some: { type: "J_MOINS_3" } },
    },
  });

  return NextResponse.json({ ...compteurs, aRelancer });
}
