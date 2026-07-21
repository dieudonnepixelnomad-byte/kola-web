import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const querySchema = z.object({ lienPaiement: z.string().min(1) });

// Polling leger pour la page /pay/[lienPaiement] : indique si le dernier
// paiement en attente a abouti, sans exposer d'autre donnee.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse({ lienPaiement: searchParams.get("lienPaiement") });
  if (!parsed.success) return NextResponse.json({ error: "Requete invalide" }, { status: 400 });

  const abonnement = await prisma.abonnement.findUnique({
    where: { lienPaiement: parsed.data.lienPaiement },
    include: { transactions: { orderBy: { recuLe: "desc" }, take: 1 } },
  });
  if (!abonnement) return NextResponse.json({ error: "Abonnement introuvable" }, { status: 404 });

  const derniere = abonnement.transactions[0];
  return NextResponse.json({
    statutAbonnement: abonnement.statut,
    statutTransaction: derniere?.statut ?? null,
  });
}
