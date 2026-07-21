import { prisma } from "./prisma";
import { configPourOffre, getPrestataire } from "./paiement/factory";
import { envoyerRelance } from "./relances/dispatch";
import { enqueuerEvenement } from "./webhooksSortants";

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// Logique partagee webhook + reconciliation cron : marque une Transaction comme
// REUSSIE et fait avancer l'Abonnement (statut ACTIF, nouvelle dateEcheance).
// Idempotent : no-op si la Transaction est deja REUSSIE.
export async function appliquerPaiementReussi(transactionId: string, payloadBrut?: unknown) {
  const tenantId = await prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.findUnique({
      where: { id: transactionId },
      include: { abonnement: { include: { offre: { include: { app: true } } } } },
    });
    if (!transaction || transaction.statut === "REUSSIE") return null;

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

    return abonnement.offre.app.tenantId;
  });

  if (tenantId) {
    await enqueuerEvenement(tenantId, "transaction.reussie", { transactionId });
    await enqueuerEvenement(tenantId, "abonnement.active", { transactionId });
  }
}

// §7 — avance chaque Abonnement dans le temps (relances + transitions de statut).
export async function avancerAbonnements() {
  const now = new Date();
  const abonnements = await prisma.abonnement.findMany({
    where: { statut: { not: "EXPIRE" } },
    include: { offre: { include: { app: true } }, logsRelance: true },
  });

  let relancesJMoins3 = 0;
  let relancesJEcheance = 0;
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
        await envoyerRelance(abonnement.id, "J_MOINS_3");
        relancesJMoins3++;
      }
      if (now.getTime() >= echeanceMs) {
        const dejaRelanceEcheance = abonnement.logsRelance.some(
          (log) => log.type === "J_ECHEANCE" && (!abonnement.dateActivation || log.envoyeLe > abonnement.dateActivation)
        );
        if (!dejaRelanceEcheance) {
          await envoyerRelance(abonnement.id, "J_ECHEANCE");
          relancesJEcheance++;
        }
        await prisma.abonnement.update({ where: { id: abonnement.id }, data: { statut: "TOLERANCE" } });
        await enqueuerEvenement(offre.app.tenantId, "abonnement.tolerance", { abonnementId: abonnement.id });
        passesEnTolerance++;
      }
      continue;
    }

    if (statut === "TOLERANCE") {
      if (now.getTime() >= echeanceMs + toleranceMs) {
        await prisma.abonnement.update({ where: { id: abonnement.id }, data: { statut: "COUPE" } });
        await enqueuerEvenement(offre.app.tenantId, "abonnement.coupe", { abonnementId: abonnement.id });
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
        await enqueuerEvenement(offre.app.tenantId, "abonnement.expire", { abonnementId: abonnement.id });
        passesEnExpire++;
      } else if (!dejaRelance7 && now.getTime() >= echeanceMs + toleranceMs + sept7JoursMs) {
        await envoyerRelance(abonnement.id, "J_PLUS_7");
        relancesJPlus7++;
      }
    }
  }

  return { relancesJMoins3, relancesJEcheance, passesEnTolerance, passesEnCoupe, relancesJPlus7, passesEnExpire };
}

// Rattrape les paiements dont le webhook n'est jamais arrive (tous
// prestataires confondus, resolus via lib/paiement/factory).
export async function reconcilierTransactionsEnAttente() {
  const seuil = new Date(Date.now() - 15 * 60 * 1000);
  const transactions = await prisma.transaction.findMany({
    where: { statut: "EN_ATTENTE", recuLe: { lt: seuil }, providerTransactionId: { not: null } },
    include: { abonnement: { include: { offre: true } } },
  });

  let reconcilies = 0;
  for (const transaction of transactions) {
    if (!transaction.providerTransactionId) continue;

    try {
      const config = await configPourOffre(transaction.abonnement.offre.id);
      const prestataire = getPrestataire(config);
      const { statut } = await prestataire.verifier(transaction.providerTransactionId);
      if (statut === "SUCCESSFUL") {
        await appliquerPaiementReussi(transaction.id);
        reconcilies++;
      } else if (statut === "FAILED") {
        await prisma.transaction.update({ where: { id: transaction.id }, data: { statut: "ECHOUEE" } });
      }
    } catch {
      // Erreur reseau/provider/config manquante : on retentera au prochain passage du cron.
      continue;
    }
  }

  return reconcilies;
}
