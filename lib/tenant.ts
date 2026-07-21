// Regle d'or (cf. kola-web-cahier-des-charges.md §5.3) : aucune requete metier
// ne s'execute sans passer par contexteTenant(). Organization (Better Auth) et
// Tenant (domaine) partagent le meme id, crees ensemble dans une transaction.
import { headers } from "next/headers";
import { prisma } from "./prisma";

export class TenantAuthError extends Error {
  constructor(
    public status: 401 | 403,
    message: string
  ) {
    super(message);
  }
}

export type RoleKola = "proprietaire" | "admin" | "lecture";

export type ContexteTenant = {
  tenantId: string;
  organizationId: string;
  role: RoleKola;
  userId: string;
};

function estRoleValide(role: string): role is RoleKola {
  return role === "proprietaire" || role === "admin" || role === "lecture";
}

export async function contexteTenant(): Promise<ContexteTenant> {
  // Import differe : evite le cycle statique auth.ts -> tenant.ts au chargement du module.
  const { auth } = await import("./auth");
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new TenantAuthError(401, "Non authentifie");

  let organizationId = session.session.activeOrganizationId;
  if (!organizationId) {
    const premierMembre = await prisma.member.findFirst({ where: { userId: session.user.id } });
    if (!premierMembre) throw new TenantAuthError(403, "Aucune organisation active");
    organizationId = premierMembre.organizationId;
  }

  const membre = await prisma.member.findFirst({
    where: { organizationId, userId: session.user.id },
  });
  if (!membre || !estRoleValide(membre.role)) {
    throw new TenantAuthError(403, "Acces refuse a ce tenant");
  }

  return { tenantId: organizationId, organizationId, role: membre.role, userId: session.user.id };
}

export function exigerRole(ctx: ContexteTenant, rolesAutorises: RoleKola[]): void {
  if (!rolesAutorises.includes(ctx.role)) {
    throw new TenantAuthError(403, `Role ${ctx.role} insuffisant (requis: ${rolesAutorises.join(", ")})`);
  }
}

function slugify(nom: string): string {
  return (
    nom
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "tenant"
  );
}

async function genererSlugUnique(nom: string): Promise<string> {
  const base = slugify(nom);
  let slug = base;
  let suffixe = 0;
  while (await prisma.tenant.findUnique({ where: { slug } })) {
    suffixe += 1;
    slug = `${base}-${suffixe}`;
  }
  return slug;
}

// Appele depuis lib/auth.ts (organizationHooks.afterCreateOrganization) : cree
// le Tenant domaine jumeau de l'Organization Better Auth (meme id), puis
// inscrit ce nouveau tenant comme Abonne du tenant systeme "Kola" (dogfooding,
// cf. §11) sur le palier gratuit "decouverte".
export async function creerTenantPourOrganisation(organizationId: string, nom: string): Promise<void> {
  const slug = await genererSlugUnique(nom);
  await prisma.tenant.create({
    data: { id: organizationId, nom, slug, statutPlateforme: "ACTIF" },
  });

  const tenantSysteme = await prisma.tenant.findFirst({ where: { estSysteme: true } });
  if (!tenantSysteme) return; // pas encore seede (dev) : dogfooding differe

  const appPlateforme = await prisma.app.findFirst({ where: { tenantId: tenantSysteme.id } });
  const offreDecouverte = appPlateforme
    ? await prisma.offre.findFirst({ where: { appId: appPlateforme.id, slug: "decouverte" } })
    : null;
  if (!offreDecouverte) return;

  const abonneSysteme = await prisma.abonne.upsert({
    where: { tenantId_identifiantExterne: { tenantId: tenantSysteme.id, identifiantExterne: organizationId } },
    update: {},
    create: { tenantId: tenantSysteme.id, identifiantExterne: organizationId, email: `${nom} (organizationId=${organizationId})` },
  });

  const dejaAbonne = await prisma.abonnement.findFirst({
    where: { abonneId: abonneSysteme.id, offreId: offreDecouverte.id },
  });
  if (!dejaAbonne) {
    await prisma.abonnement.create({
      data: {
        abonneId: abonneSysteme.id,
        offreId: offreDecouverte.id,
        statut: "ACTIF",
        dateActivation: new Date(),
        dateEcheance: new Date(Date.now() + offreDecouverte.periodiciteJours * 24 * 60 * 60 * 1000),
      },
    });
  }
}
