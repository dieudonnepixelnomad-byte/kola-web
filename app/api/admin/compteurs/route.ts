import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  const groupes = await prisma.abonnement.groupBy({
    by: ["statut"],
    _count: true,
  });

  const compteurs = { ACTIF: 0, TOLERANCE: 0, COUPE: 0, EXPIRE: 0 };
  for (const g of groupes) {
    compteurs[g.statut] = g._count;
  }

  const aRelancer = await prisma.abonnement.count({
    where: {
      statut: "ACTIF",
      logsRelance: { some: { type: "J_MOINS_3" } },
    },
  });

  return NextResponse.json({ ...compteurs, aRelancer });
}
