// Interface commune a tous les prestataires de paiement Mobile Money
// (cf. kola-web-cahier-des-charges.md §6.1). Le reste du systeme ne parle
// jamais a un prestataire concret, seulement a cette interface.
import type { PrestataireType } from "@/lib/generated/prisma/enums";

export type StatutPaiementProvider = "PENDING" | "SUCCESSFUL" | "FAILED";

export type IdentifiantsCampay = { appUsername: string; appPassword: string };
export type IdentifiantsMesomb = { applicationKey: string; accessKey: string; secretKey: string };
export type IdentifiantsPaydunya = { masterKey: string; privateKey: string; publicKey: string; token: string };
export type IdentifiantsFlutterwave = { secretKey: string; encryptionKey: string };

export interface RequeteWebhook {
  headers: Headers;
  corpsBrut: string;
}

export interface PrestatairePaiement {
  readonly type: PrestataireType;

  initier(params: {
    montant: number;
    devise: string;
    telephone: string;
    description: string;
    referenceInterne: string;
  }): Promise<{ providerTransactionId: string; statut: StatutPaiementProvider }>;

  verifier(providerTransactionId: string): Promise<{ statut: StatutPaiementProvider }>;

  verifierWebhook(req: RequeteWebhook): boolean;

  parserWebhook(req: RequeteWebhook): {
    referenceInterne: string | null;
    providerTransactionId: string | null;
    statut: StatutPaiementProvider;
  };

  tester(): Promise<boolean>;
}
