import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { contexteTenant, exigerRole, TenantAuthError } from "@/lib/tenant";

const patchSchema = z.object({
  type: z.enum(["J_MOINS_3", "J_ECHEANCE", "J_PLUS_7"]),
  canal: z.enum(["WHATSAPP", "SMS", "EMAIL"]),
  contenu: z.string().min(1),
  actif: z.boolean().default(true),
});

export async function GET() {
  let ctx;
  try {
    ctx = await contexteTenant();
  } catch (e) {
    if (e instanceof TenantAuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }

  const modeles = await prisma.modeleRelance.findMany({ where: { tenantId: ctx.tenantId } });
  return NextResponse.json({ modeles });
}

export async function PUT(req: Request) {
  let ctx;
  try {
    ctx = await contexteTenant();
    exigerRole(ctx, ["proprietaire", "admin"]);
  } catch (e) {
    if (e instanceof TenantAuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Requete invalide" }, { status: 400 });

  const modele = await prisma.modeleRelance.upsert({
    where: { tenantId_type_canal: { tenantId: ctx.tenantId, type: parsed.data.type, canal: parsed.data.canal } },
    update: { contenu: parsed.data.contenu, actif: parsed.data.actif },
    create: { tenantId: ctx.tenantId, ...parsed.data },
  });

  return NextResponse.json({ id: modele.id });
}
