import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { contexteTenant, TenantAuthError } from "@/lib/tenant";
import type { StatutAbonnement } from "@/lib/generated/prisma/enums";

const STATUTS_VALIDES: StatutAbonnement[] = ["ACTIF", "TOLERANCE", "COUPE", "EXPIRE"];

export async function GET(req: Request) {
  let ctx;
  try {
    ctx = await contexteTenant();
  } catch (e) {
    if (e instanceof TenantAuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }

  const { searchParams } = new URL(req.url);
  const statutParam = searchParams.get("statut");
  const statut =
    statutParam && STATUTS_VALIDES.includes(statutParam as StatutAbonnement)
      ? (statutParam as StatutAbonnement)
      : undefined;

  const abonnements = await prisma.abonnement.findMany({
    where: { ...(statut ? { statut } : {}), abonne: { tenantId: ctx.tenantId } },
    include: {
      abonne: true,
      offre: true,
      transactions: { orderBy: { recuLe: "desc" }, take: 1 },
      logsRelance: { orderBy: { envoyeLe: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ abonnements });
}
