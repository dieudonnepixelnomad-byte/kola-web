import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";
import { randomBytes } from "crypto";
import { contexteTenant, exigerRole, TenantAuthError } from "@/lib/tenant";
import { enregistrerAction } from "@/lib/journalAudit";

const EVENEMENTS_VALIDES = [
  "abonnement.active",
  "abonnement.tolerance",
  "abonnement.coupe",
  "abonnement.expire",
  "transaction.reussie",
];

const bodySchema = z.object({
  url: z.string().url(),
  evenements: z.array(z.enum(EVENEMENTS_VALIDES as [string, ...string[]])).min(1),
});

export async function GET() {
  let ctx;
  try {
    ctx = await contexteTenant();
  } catch (e) {
    if (e instanceof TenantAuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }

  const webhooks = await prisma.webhookSortant.findMany({
    where: { tenantId: ctx.tenantId },
    select: { id: true, url: true, evenements: true, actif: true, createdAt: true },
  });
  return NextResponse.json({ webhooks });
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
  if (!parsed.success) return NextResponse.json({ error: "Requete invalide" }, { status: 400 });

  const secretClair = randomBytes(24).toString("hex");
  const webhook = await prisma.webhookSortant.create({
    data: {
      tenantId: ctx.tenantId,
      url: parsed.data.url,
      evenements: parsed.data.evenements,
      secret: encrypt(secretClair),
    },
  });

  await enregistrerAction(ctx, { action: "webhook.cree", cible: webhook.id, meta: { url: webhook.url } });

  // Le secret n'est jamais retourne apres cette seule reponse.
  return NextResponse.json({ id: webhook.id, secret: secretClair }, { status: 201 });
}
