// Fabrique + resolution de configuration (cf. §6.2/§6.3). Le reste du
// systeme n'importe jamais un adaptateur concret directement.
import { decrypt } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { CampayAdapter } from "./campay";
import { MesombAdapter } from "./mesomb";
import { PaydunyaAdapter } from "./paydunya";
import { FlutterwaveAdapter } from "./flutterwave";
import type { PrestatairePaiement } from "./types";
import type { ConfigurationPaiementModel } from "@/lib/generated/prisma/models";

export function getPrestataire(config: ConfigurationPaiementModel): PrestatairePaiement {
  const identifiants = JSON.parse(
    decrypt([config.identifiantsIv, config.identifiantsTag, config.identifiantsChiffres].join(":"))
  );

  switch (config.prestataire) {
    case "CAMPAY":
      return new CampayAdapter(identifiants);
    case "MESOMB":
      return new MesombAdapter(identifiants);
    case "PAYDUNYA":
      return new PaydunyaAdapter(identifiants);
    case "FLUTTERWAVE":
      return new FlutterwaveAdapter(identifiants);
    default: {
      const exhaustif: never = config.prestataire;
      throw new Error(`Prestataire inconnu: ${exhaustif}`);
    }
  }
}

// Resout la configuration a utiliser pour une Offre : celle qui lui est
// directement assignee, sinon la config par defaut du tenant (§6.3).
export async function configPourOffre(offreId: string): Promise<ConfigurationPaiementModel> {
  const offre = await prisma.offre.findUniqueOrThrow({
    where: { id: offreId },
    include: { configuration: true, app: true },
  });

  if (offre.configuration) return offre.configuration;

  const parDefaut = await prisma.configurationPaiement.findFirst({
    where: { tenantId: offre.app.tenantId, parDefaut: true, actif: true },
  });
  if (!parDefaut) {
    throw new Error(
      "Aucun prestataire de paiement configure pour cette offre (ni config dediee, ni config par defaut du tenant)."
    );
  }
  return parDefaut;
}
