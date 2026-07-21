// Orchestre l'envoi d'une relance : resout le modele du tenant, rend le
// template, envoie via le canal, journalise -- jamais bloquant pour la
// state machine (§8.3).
import { prisma } from "../prisma";
import { rendreTemplate } from "./template";
import { whatsapp } from "./whatsapp";
import { sms } from "./sms";
import { email } from "./email";
import type { CanalEnvoi } from "./types";
import type { TypeRelance, CanalRelance } from "../generated/prisma/enums";

const CANAUX: Record<CanalRelance, CanalEnvoi> = { WHATSAPP: whatsapp, SMS: sms, EMAIL: email };

export async function envoyerRelance(abonnementId: string, type: TypeRelance) {
  const abonnement = await prisma.abonnement.findUniqueOrThrow({
    where: { id: abonnementId },
    include: { abonne: true, offre: { include: { app: true } } },
  });

  const modele = await prisma.modeleRelance.findFirst({
    where: { tenantId: abonnement.offre.app.tenantId, type, actif: true },
  });

  if (!modele) {
    await prisma.logRelance.create({
      data: { abonnementId, type, canal: "WHATSAPP", statutEnvoi: "IGNORE", erreur: "Aucun modele actif pour ce type" },
    });
    return;
  }

  const destinataire = abonnement.abonne.telephone ?? abonnement.abonne.email;
  if (!destinataire) {
    await prisma.logRelance.create({
      data: { abonnementId, type, canal: modele.canal, statutEnvoi: "IGNORE", erreur: "Aucun contact pour cet abonne" },
    });
    return;
  }

  const message = rendreTemplate(modele.contenu, {
    nom: abonnement.abonne.telephone ?? abonnement.abonne.identifiantExterne,
    offre: abonnement.offre.nom,
    prix: abonnement.offre.prix,
    jours: abonnement.offre.toleranceJours,
    lien: `${process.env.BETTER_AUTH_URL ?? ""}/pay/${abonnement.lienPaiement}`,
  });

  const resultat = await CANAUX[modele.canal].envoyer(destinataire, message);

  await prisma.logRelance.create({
    data: {
      abonnementId,
      type,
      canal: modele.canal,
      statutEnvoi: resultat.ok ? "ENVOYE" : "ECHEC",
      erreur: resultat.ok ? null : resultat.erreur,
    },
  });
}
