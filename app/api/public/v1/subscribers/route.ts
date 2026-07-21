import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { contexteApiPublique, PublicApiAuthError } from "@/lib/publicApiAuth";

const bodySchema = z.object({
  identifiantExterne: z.string().min(1),
  telephone: z.string().optional(),
  email: z.string().email().optional(),
});

export async function GET(req: Request) {
  let ctx;
  try {
    ctx = await contexteApiPublique(req);
  } catch (e) {
    if (e instanceof PublicApiAuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }

  const abonnes = await prisma.abonne.findMany({
    where: { tenantId: ctx.tenantId },
    select: { identifiantExterne: true, telephone: true, email: true, createdAt: true },
    take: 200,
  });
  return NextResponse.json({ subscribers: abonnes });
}

export async function POST(req: Request) {
  let ctx;
  try {
    ctx = await contexteApiPublique(req);
  } catch (e) {
    if (e instanceof PublicApiAuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Requete invalide" }, { status: 400 });

  const abonne = await prisma.abonne.upsert({
    where: { tenantId_identifiantExterne: { tenantId: ctx.tenantId, identifiantExterne: parsed.data.identifiantExterne } },
    update: { telephone: parsed.data.telephone, email: parsed.data.email },
    create: { tenantId: ctx.tenantId, ...parsed.data },
  });

  return NextResponse.json({ identifiantExterne: abonne.identifiantExterne }, { status: 201 });
}
