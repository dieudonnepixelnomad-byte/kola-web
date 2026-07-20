import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifierSignatureWebhook } from "@/lib/campay";
import { appliquerPaiementReussi } from "@/lib/stateMachine";

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-campay-signature");

  if (!verifierSignatureWebhook(rawBody, signature)) {
    return NextResponse.json({ error: "Signature invalide" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Payload invalide" }, { status: 400 });
  }

  const providerTransactionId =
    typeof payload === "object" && payload !== null && "reference" in payload
      ? String((payload as { reference: unknown }).reference)
      : null;

  if (!providerTransactionId) {
    return NextResponse.json({ ok: true });
  }

  const transaction = await prisma.transaction.findUnique({
    where: { providerTransactionId },
  });

  // Transaction inconnue ou deja traitee : no-op, protection anti double-webhook.
  if (!transaction || transaction.statut === "REUSSIE") {
    return NextResponse.json({ ok: true });
  }

  await appliquerPaiementReussi(transaction.id, payload);

  return NextResponse.json({ ok: true });
}
