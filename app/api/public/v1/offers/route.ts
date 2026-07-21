import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { contexteApiPublique, PublicApiAuthError } from "@/lib/publicApiAuth";

export async function GET(req: Request) {
  let ctx;
  try {
    ctx = await contexteApiPublique(req);
  } catch (e) {
    if (e instanceof PublicApiAuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }

  const offres = await prisma.offre.findMany({
    where: { appId: ctx.appId, actif: true },
    select: { slug: true, nom: true, prix: true, devise: true, periodiciteJours: true, toleranceJours: true },
  });

  return NextResponse.json({ offers: offres });
}
