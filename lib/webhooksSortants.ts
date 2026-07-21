// Webhooks sortants (§9.2) : signature HMAC-SHA256, livraison avec retry
// exponentiel. Jamais bloquant pour la logique metier qui les declenche.
import { createHmac } from "crypto";
import { prisma } from "./prisma";
import { decrypt } from "./crypto";

const MAX_TENTATIVES = 6;

function backoffMs(tentatives: number): number {
  return Math.min(60_000 * 2 ** tentatives, 6 * 60 * 60 * 1000); // plafonne a 6h
}

// A appeler apres toute transition d'etat pertinente (paiement reussi,
// abonnement.active/tolerance/coupe/expire).
export async function enqueuerEvenement(tenantId: string, evenement: string, payload: unknown) {
  const webhooks = await prisma.webhookSortant.findMany({
    where: { tenantId, actif: true, evenements: { has: evenement } },
  });

  for (const webhook of webhooks) {
    await prisma.livraisonWebhook.create({
      data: {
        webhookSortantId: webhook.id,
        evenement,
        payload: payload as never,
        prochainEssai: new Date(),
      },
    });
  }
}

export async function livrerWebhooksEnAttente() {
  const enAttente = await prisma.livraisonWebhook.findMany({
    where: { livreLe: null, prochainEssai: { lte: new Date() }, tentatives: { lt: MAX_TENTATIVES } },
    include: { webhookSortant: true },
    take: 50,
  });

  let livres = 0;
  let echoues = 0;

  for (const livraison of enAttente) {
    const { webhookSortant } = livraison;
    const secret = decrypt(webhookSortant.secret);
    const corps = JSON.stringify(livraison.payload);
    const signature = createHmac("sha256", secret).update(corps).digest("hex");

    try {
      const res = await fetch(webhookSortant.url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Kola-Signature": signature, "X-Kola-Event": livraison.evenement },
        body: corps,
      });

      if (res.ok) {
        await prisma.livraisonWebhook.update({
          where: { id: livraison.id },
          data: { livreLe: new Date(), statutHttp: res.status, tentatives: livraison.tentatives + 1 },
        });
        livres++;
      } else {
        await prisma.livraisonWebhook.update({
          where: { id: livraison.id },
          data: {
            statutHttp: res.status,
            tentatives: livraison.tentatives + 1,
            prochainEssai: new Date(Date.now() + backoffMs(livraison.tentatives + 1)),
          },
        });
        echoues++;
      }
    } catch {
      await prisma.livraisonWebhook.update({
        where: { id: livraison.id },
        data: {
          tentatives: livraison.tentatives + 1,
          prochainEssai: new Date(Date.now() + backoffMs(livraison.tentatives + 1)),
        },
      });
      echoues++;
    }
  }

  return { livres, echoues };
}
