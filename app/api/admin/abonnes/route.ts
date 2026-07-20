import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { StatutAbonnement } from "@/lib/generated/prisma/enums";

const STATUTS_VALIDES: StatutAbonnement[] = ["ACTIF", "TOLERANCE", "COUPE", "EXPIRE"];

export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const statutParam = searchParams.get("statut");
  const statut =
    statutParam && STATUTS_VALIDES.includes(statutParam as StatutAbonnement)
      ? (statutParam as StatutAbonnement)
      : undefined;

  const abonnements = await prisma.abonnement.findMany({
    where: statut ? { statut } : undefined,
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
