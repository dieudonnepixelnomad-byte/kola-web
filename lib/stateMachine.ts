import { prisma } from "./prisma";
import { decrypt } from "./crypto";
import { verifierTransaction } from "./campay";

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// Logique partagee webhook + reconciliation cron : marque une Transaction comme
// REUSSIE et fait avancer l'Abonnement (statut ACTIF, nouvelle dateEcheance).
// Idempotent : no-op si la Transaction est deja REUSSIE.
export async function appliquerPaiementReussi(transactionId: string, payloadBrut?: unknown) {
  await prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.findUnique({
      where: { id: transactionId },
      include: { abonnement: { include: { offre: true } } },
    });
    if (!transaction || transaction.statut === "REUSSIE") return;

    const now = new Date();
    const { abonnement } = transaction;
    const base = abonnement.dateEcheance && abonnement.dateEcheance > now ? abonnement.dateEcheance : now;
    const nouvelleEcheance = addDays(base, abonnement.offre.periodiciteJours);

    await tx.transaction.update({
      where: { id: transaction.id },
      data: {
        statut: "REUSSIE",
        traiteLe: now,
        ...(payloadBrut !== undefined ? { payloadBrut: payloadBrut as never } : {}),
      },
    });

    await tx.abonnement.update({
      where: { id: abonnement.id },
      data: {
        statut: "ACTIF",
        dateEcheance: nouvelleEcheance,
        dateActivation: abonnement.dateActivation ?? now,
      },
    });
  });
}

// §6.3.2 — avance chaque Abonnement dans le temps (relances + transitions de statut).
export async function avancerAbonnements() {
  const now = new Date();
  const abonnements = await prisma.abonnement.findMany({
    where: { statut: { not: "EXPIRE" } },
    include: { offre: true, logsRelance: true },
  });

  let relancesJMoins3 = 0;
  let passesEnTolerance = 0;
  let passesEnCoupe = 0;
  let relancesJPlus7 = 0;
  let passesEnExpire = 0;

  for (const abonnement of abonnements) {
    if (!abonnement.dateEcheance) continue;
    const { statut, dateEcheance, offre } = abonnement;
    const toleranceMs = offre.toleranceJours * 24 * 60 * 60 * 1000;
    const echeanceMs = dateEcheance.getTime();

    if (statut === "ACTIF") {
      const troisJoursMs = 3 * 24 * 60 * 60 * 1000;
      const dejaRelance3 = abonnement.logsRelance.some(
        (log) => log.type === "J_MOINS_3" && (!abonnement.dateActivation || log.envoyeLe > abonnement.dateActivation)
      );
      if (!dejaRelance3 && echeanceMs - now.getTime() <= troisJoursMs && echeanceMs - now.getTime() > 0) {
        await prisma.logRelance.create({ data: { abonnementId: abonnement.id, type: "J_MOINS_3" } });
        relancesJMoins3++;
      }
      if (now.getTime() >= echeanceMs) {
        await prisma.abonnement.update({ where: { id: abonnement.id }, data: { statut: "TOLERANCE" } });
        passesEnTolerance++;
      }
      continue;
    }

    if (statut === "TOLERANCE") {
      if (now.getTime() >= echeanceMs + toleranceMs) {
        await prisma.abonnement.update({ where: { id: abonnement.id }, data: { statut: "COUPE" } });
        passesEnCoupe++;
      }
      continue;
    }

    if (statut === "COUPE") {
      const sept7JoursMs = 7 * 24 * 60 * 60 * 1000;
      const quatorze14JoursMs = 14 * 24 * 60 * 60 * 1000;
      const dejaRelance7 = abonnement.logsRelance.some((log) => log.type === "J_PLUS_7");

      if (now.getTime() >= echeanceMs + toleranceMs + quatorze14JoursMs) {
        await prisma.abonnement.update({ where: { id: abonnement.id }, data: { statut: "EXPIRE" } });
        passesEnExpire++;
      } else if (!dejaRelance7 && now.getTime() >= echeanceMs + toleranceMs + sept7JoursMs) {
        await prisma.logRelance.create({ data: { abonnementId: abonnement.id, type: "J_PLUS_7" } });
        relancesJPlus7++;
      }
    }
  }

  return { relancesJMoins3, passesEnTolerance, passesEnCoupe, relancesJPlus7, passesEnExpire };
}

// Rattrape les paiements dont le webhook Campay n'est jamais arrive.
export async function reconcilierTransactionsEnAttente() {
  const seuil = new Date(Date.now() - 15 * 60 * 1000);
  const transactions = await prisma.transaction.findMany({
    where: { statut: "EN_ATTENTE", recuLe: { lt: seuil } },
    include: { abonnement: { include: { offre: { include: { app: { include: { tenant: true } } } } } } },
  });

  let reconcilies = 0;
  for (const transaction of transactions) {
    const { tenant } = transaction.abonnement.offre.app;
    if (!tenant.campayAppId || !tenant.campayAppSecret) continue;

    const campayConfig = {
      appUsername: decrypt(tenant.campayAppId),
      appPassword: decrypt(tenant.campayAppSecret),
    };

    try {
      const { statut } = await verifierTransaction(campayConfig, transaction.providerTransactionId);
      if (statut === "SUCCESSFUL") {
        await appliquerPaiementReussi(transaction.id);
        reconcilies++;
      } else if (statut === "FAILED") {
        await prisma.transaction.update({ where: { id: transaction.id }, data: { statut: "ECHOUEE" } });
      }
    } catch {
      // Erreur reseau/Campay : on retentera au prochain passage du cron.
      continue;
    }
  }

  return reconcilies;
}
