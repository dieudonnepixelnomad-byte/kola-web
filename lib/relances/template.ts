import type { VariablesTemplate } from "./types";

// Variables autorisees : {nom} {offre} {prix} {jours} {lien} (§8.2).
export function rendreTemplate(contenu: string, variables: VariablesTemplate): string {
  return contenu
    .replaceAll("{nom}", variables.nom)
    .replaceAll("{offre}", variables.offre)
    .replaceAll("{prix}", String(variables.prix))
    .replaceAll("{jours}", String(variables.jours))
    .replaceAll("{lien}", variables.lien);
}

export const MODELES_DEFAUT: { type: "J_MOINS_3" | "J_ECHEANCE" | "J_PLUS_7"; contenu: string }[] = [
  {
    type: "J_MOINS_3",
    contenu: "Salut {nom} 👋 Ton accès {offre} expire dans {jours} jours.\n{prix} FCFA pour continuer 👉 {lien}",
  },
  {
    type: "J_ECHEANCE",
    contenu: "Salut {nom}, ton accès {offre} expire aujourd'hui. Renouvelle ici 👉 {lien}",
  },
  {
    type: "J_PLUS_7",
    contenu: "{nom}, ton accès {offre} est suspendu depuis quelques jours. Réactive-le quand tu veux 👉 {lien}",
  },
];
