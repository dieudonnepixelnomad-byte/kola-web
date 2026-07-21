// Roles Kola (PROPRIETAIRE/ADMIN/LECTURE, cf. kola-web-cahier-des-charges.md §5.2)
// portes par le plugin organization de Better Auth. LECTURE n'a aucune
// permission d'ecriture ; ADMIN gere tout sauf facturation/suppression tenant.
import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements } from "better-auth/plugins/organization/access";

const statement = {
  ...defaultStatements,
  offre: ["create", "update", "delete"],
  prestataire: ["create", "update", "delete"],
  abonne: ["update"],
  relance: ["create", "update", "delete"],
  webhook: ["create", "update", "delete"],
  equipe: ["invite", "update", "remove"],
  facturation: ["update"],
  tenant: ["delete"],
} as const;

export const ac = createAccessControl(statement);

export const lecture = ac.newRole({
  organization: [],
  member: [],
  invitation: [],
  team: [],
  ac: ["read"],
  offre: [],
  prestataire: [],
  abonne: [],
  relance: [],
  webhook: [],
  equipe: [],
  facturation: [],
  tenant: [],
});

export const admin = ac.newRole({
  organization: ["update"],
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],
  team: [],
  ac: ["read"],
  offre: ["create", "update", "delete"],
  prestataire: ["create", "update", "delete"],
  abonne: ["update"],
  relance: ["create", "update", "delete"],
  webhook: ["create", "update", "delete"],
  equipe: ["invite", "update", "remove"],
  facturation: [],
  tenant: [],
});

export const proprietaire = ac.newRole({
  organization: ["update", "delete"],
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],
  team: [],
  ac: ["create", "read", "update", "delete"],
  offre: ["create", "update", "delete"],
  prestataire: ["create", "update", "delete"],
  abonne: ["update"],
  relance: ["create", "update", "delete"],
  webhook: ["create", "update", "delete"],
  equipe: ["invite", "update", "remove"],
  facturation: ["update"],
  tenant: ["delete"],
});
