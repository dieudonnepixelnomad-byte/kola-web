import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { contexteTenant, TenantAuthError } from "@/lib/tenant";

function ligneCsv(valeurs: (string | number)[]): string {
  return valeurs.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(",") + "\n";
}

export async function GET() {
  let ctx;
  try {
    ctx = await contexteTenant();
  } catch (e) {
    if (e instanceof TenantAuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }

  const abonnements = await prisma.abonnement.findMany({
    where: { abonne: { tenantId: ctx.tenantId } },
    include: { abonne: true, offre: true, transactions: { orderBy: { recuLe: "desc" }, take: 1 } },
    orderBy: { updatedAt: "desc" },
  });

  let csv = ligneCsv(["identifiantExterne", "offre", "statut", "dateEcheance", "dernierPaiement"]);
  for (const a of abonnements) {
    csv += ligneCsv([
      a.abonne.identifiantExterne,
      a.offre.nom,
      a.statut,
      a.dateEcheance?.toISOString() ?? "",
      a.transactions[0]?.recuLe.toISOString() ?? "",
    ]);
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="abonnes-kola.csv"`,
    },
  });
}
