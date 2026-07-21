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

  const logs = await prisma.logRelance.findMany({
    where: { abonnement: { abonne: { tenantId: ctx.tenantId } } },
    include: { abonnement: { include: { abonne: true, offre: true } } },
    orderBy: { envoyeLe: "desc" },
    take: 100,
  });

  const total = logs.length;
  const envoyes = logs.filter((l) => l.statutEnvoi === "ENVOYE").length;

  return NextResponse.json({ logs, total, envoyes });
}
