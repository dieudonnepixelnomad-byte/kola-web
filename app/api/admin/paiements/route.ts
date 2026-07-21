import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { contexteTenant, TenantAuthError } from "@/lib/tenant";
import type { StatutTransaction } from "@/lib/generated/prisma/enums";

const STATUTS_VALIDES: StatutTransaction[] = ["EN_ATTENTE", "REUSSIE", "ECHOUEE"];

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
  const statut = statutParam && STATUTS_VALIDES.includes(statutParam as StatutTransaction) ? (statutParam as StatutTransaction) : undefined;

  const transactions = await prisma.transaction.findMany({
    where: { ...(statut ? { statut } : {}), abonnement: { abonne: { tenantId: ctx.tenantId } } },
    include: { abonnement: { include: { abonne: true, offre: true } } },
    orderBy: { recuLe: "desc" },
    take: 200,
  });

  return NextResponse.json({ transactions });
}
