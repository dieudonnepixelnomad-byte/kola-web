import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { initierPaiement } from "@/lib/campay";

const bodySchema = z.object({
  lienPaiement: z.string().min(1),
  telephone: z.string().min(1),
  operateur: z.enum(["mtn", "orange"]),
});

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Requete invalide" }, { status: 400 });
  }
  const { lienPaiement, telephone } = parsed.data;

  const abonnement = await prisma.abonnement.findUnique({
    where: { lienPaiement },
    include: { offre: { include: { app: { include: { tenant: true } } } } },
  });

  if (!abonnement) {
    return NextResponse.json({ error: "Abonnement introuvable" }, { status: 404 });
  }

  const { tenant } = abonnement.offre.app;
  if (!tenant.campayAppId || !tenant.campayAppSecret) {
    return NextResponse.json({ error: "Configuration Campay manquante" }, { status: 500 });
  }

  const campayConfig = {
    appUsername: decrypt(tenant.campayAppId),
    appPassword: decrypt(tenant.campayAppSecret),
  };

  try {
    const { reference } = await initierPaiement(campayConfig, {
      montant: abonnement.offre.prix,
      devise: abonnement.offre.devise,
      telephone,
      description: `Abonnement ${abonnement.offre.nom}`,
      referenceExterne: `${abonnement.id}:${Date.now()}`,
    });

    await prisma.transaction.create({
      data: {
        abonnementId: abonnement.id,
        providerTransactionId: reference,
        provider: "campay",
        montant: abonnement.offre.prix,
        statut: "EN_ATTENTE",
      },
    });
  } catch {
    return NextResponse.json({ error: "Echec de l'initiation du paiement Campay" }, { status: 502 });
  }

  return NextResponse.json({ ok: true, message: "En attente de confirmation sur votre telephone" });
}
