import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { configPourOffre, getPrestataire } from "@/lib/paiement/factory";

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
    include: { offre: true },
  });

  if (!abonnement) {
    return NextResponse.json({ error: "Abonnement introuvable" }, { status: 404 });
  }

  let reference = "";
  try {
    const config = await configPourOffre(abonnement.offre.id);
    const prestataire = getPrestataire(config);

    reference = randomUUID();
    const { providerTransactionId, statut } = await prestataire.initier({
      montant: abonnement.offre.prix,
      devise: abonnement.offre.devise,
      telephone,
      description: `Abonnement ${abonnement.offre.nom}`,
      referenceInterne: reference,
    });

    await prisma.transaction.create({
      data: {
        abonnementId: abonnement.id,
        reference,
        providerTransactionId,
        provider: prestataire.type,
        montant: abonnement.offre.prix,
        statut: statut === "SUCCESSFUL" ? "REUSSIE" : statut === "FAILED" ? "ECHOUEE" : "EN_ATTENTE",
      },
    });
  } catch {
    return NextResponse.json({ error: "Echec de l'initiation du paiement" }, { status: 502 });
  }

  return NextResponse.json({ ok: true, reference, message: "En attente de confirmation sur votre telephone" });
}
