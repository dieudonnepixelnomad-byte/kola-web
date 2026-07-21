import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";
import { contexteTenant, exigerRole, TenantAuthError } from "@/lib/tenant";
import { enregistrerAction } from "@/lib/journalAudit";

const bodySchema = z.object({
  prestataire: z.enum(["CAMPAY", "MESOMB", "PAYDUNYA", "FLUTTERWAVE"]),
  nom: z.string().min(1),
  identifiants: z.record(z.string(), z.string()),
  parDefaut: z.boolean().optional(),
});

export async function GET() {
  let ctx;
  try {
    ctx = await contexteTenant();
  } catch (e) {
    if (e instanceof TenantAuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }

  const configs = await prisma.configurationPaiement.findMany({
    where: { tenantId: ctx.tenantId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      prestataire: true,
      nom: true,
      actif: true,
      parDefaut: true,
      verifieLe: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ configs });
}

export async function POST(req: Request) {
  let ctx;
  try {
    ctx = await contexteTenant();
    exigerRole(ctx, ["proprietaire", "admin"]);
  } catch (e) {
    if (e instanceof TenantAuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Requete invalide" }, { status: 400 });
  }
  const { prestataire, nom, identifiants, parDefaut } = parsed.data;

  const chiffre = encrypt(JSON.stringify(identifiants));
  const [iv, tag, data] = chiffre.split(":");

  const config = await prisma.$transaction(async (tx) => {
    if (parDefaut) {
      await tx.configurationPaiement.updateMany({
        where: { tenantId: ctx.tenantId, parDefaut: true },
        data: { parDefaut: false },
      });
    }
    return tx.configurationPaiement.create({
      data: {
        tenantId: ctx.tenantId,
        prestataire,
        nom,
        identifiantsIv: iv,
        identifiantsTag: tag,
        identifiantsChiffres: data,
        parDefaut: !!parDefaut,
      },
    });
  });

  await enregistrerAction(ctx, { action: "config.cree", cible: config.id, meta: { prestataire } });
  return NextResponse.json({ id: config.id }, { status: 201 });
}
