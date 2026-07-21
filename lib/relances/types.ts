export type VariablesTemplate = {
  nom: string;
  offre: string;
  prix: number;
  jours: number;
  lien: string;
};

export type ResultatEnvoi = { ok: true } | { ok: false; erreur: string };

export interface CanalEnvoi {
  envoyer(destinataire: string, message: string): Promise<ResultatEnvoi>;
}
