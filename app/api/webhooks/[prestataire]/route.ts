// Route webhook unique pour les 4 prestataires (§6.5). Sequence commune :
// 1) parser le payload pour extraire notre reference interne,
// 2) resoudre Transaction -> Abonnement -> Offre -> App -> Tenant,
// 3) verifier la signature avec la config DE CE TENANT (jamais un secret
//    global -- resoudre le tenant AVANT de faire confiance au payload),
// 4) idempotence (deja REUSSIE -> no-op), puis appliquer le paiement.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPrestataire } from "@/lib/paiement/factory";
import { appliquerPaiementReussi } from "@/lib/stateMachine";
import type { PrestataireType } from "@/lib/generated/prisma/enums";

const PRESTATAIRES_VALIDES: PrestataireType[] = ["CAMPAY", "MESOMB", "PAYDUNYA", "FLUTTERWAVE"];

export async function POST(req: Request, { params }: { params: Promise<{ prestataire: string }> }) {
  const { prestataire: prestataireParam } = await params;
  const prestataireType = prestataireParam.toUpperCase();
  if (!PRESTATAIRES_VALIDES.includes(prestataireType as PrestataireType)) {
    return NextResponse.json({ error: "Prestataire inconnu" }, { status: 404 });
  }

  const corpsBrut = await req.text();
  const requeteWebhook = { headers: req.headers, corpsBrut };

  // Parsing "a l'aveugle" (sans config) uniquement pour extraire la
  // reference interne -- chaque adaptateur sait le faire sans secret,
  // le payload public ne contient que des identifiants, pas de preuve.
  const referenceInterne = extraireReferenceInterne(corpsBrut);
  if (!referenceInterne) {
    return NextResponse.json({ ok: true });
  }

  const transaction = await prisma.transaction.findUnique({
    where: { reference: referenceInterne },
    include: { abonnement: { include: { offre: { include: { app: true } } } } },
  });

  // Transaction inconnue ou deja traitee : no-op, protection anti double-webhook.
  if (!transaction || transaction.statut === "REUSSIE") {
    return NextResponse.json({ ok: true });
  }
  if (transaction.provider !== prestataireType) {
    return NextResponse.json({ error: "Prestataire incoherent" }, { status: 400 });
  }

  const config = await prisma.configurationPaiement.findFirst({
    where: { tenantId: transaction.abonnement.offre.app.tenantId, prestataire: transaction.provider, actif: true },
  });
  if (!config) {
    return NextResponse.json({ error: "Configuration introuvable pour ce tenant" }, { status: 401 });
  }

  const prestataireAdapter = getPrestataire(config);
  if (!prestataireAdapter.verifierWebhook(requeteWebhook)) {
    return NextResponse.json({ error: "Signature invalide" }, { status: 401 });
  }

  const resultat = prestataireAdapter.parserWebhook(requeteWebhook);
  if (resultat.providerTransactionId && !transaction.providerTransactionId) {
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { providerTransactionId: resultat.providerTransactionId },
    });
  }

  if (resultat.statut === "SUCCESSFUL") {
    await appliquerPaiementReussi(transaction.id, JSON.parse(corpsBrut));
  } else if (resultat.statut === "FAILED") {
    await prisma.transaction.update({ where: { id: transaction.id }, data: { statut: "ECHOUEE" } });
  }

  return NextResponse.json({ ok: true });
}

function extraireReferenceInterne(corpsBrut: string): string | null {
  try {
    const payload = JSON.parse(corpsBrut) as Record<string, unknown>;
    const candidats = [
      payload.external_reference,
      payload.externalId,
      (payload.data as Record<string, unknown> | undefined)?.tx_ref,
      (payload.custom_data as Record<string, unknown> | undefined)?.referenceInterne,
      ((payload.data as Record<string, unknown> | undefined)?.custom_data as Record<string, unknown> | undefined)
        ?.referenceInterne,
    ];
    const trouve = candidats.find((c) => typeof c === "string");
    return typeof trouve === "string" ? trouve : null;
  } catch {
    return null;
  }
}
