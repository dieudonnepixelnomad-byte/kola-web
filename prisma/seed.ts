import "dotenv/config";
import { randomUUID } from "crypto";
import { prisma } from "../lib/prisma";
import { encrypt } from "../lib/crypto";
import { auth } from "../lib/auth";
import { MODELES_DEFAUT } from "../lib/relances/template";

// Cree une paire Organization (Better Auth) + Tenant (domaine) avec le meme
// id, hors flux HTTP (le hook organizationHooks.afterCreateOrganization
// n'est declenche que par auth.api.createOrganization). Cf. lib/tenant.ts.
async function creerOrganisationEtTenant(params: {
  nom: string;
  slug: string;
  estSysteme: boolean;
}) {
  const existant = await prisma.tenant.findUnique({ where: { slug: params.slug } });
  if (existant) return existant;

  return prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: { id: randomUUID(), name: params.nom, slug: params.slug, createdAt: new Date() },
    });
    return tx.tenant.create({
      data: { id: organization.id, nom: params.nom, slug: params.slug, estSysteme: params.estSysteme },
    });
  });
}

async function main() {
  // --- Tenant systeme "Kola" (dogfooding, §11) ---------------------------
  const tenant = await creerOrganisationEtTenant({
    nom: "Kola",
    slug: "kola",
    estSysteme: true,
  });

  let app = await prisma.app.findFirst({
    where: { tenantId: tenant.id, nom: "Plateforme" },
  });
  if (!app) {
    app = await prisma.app.create({
      data: { tenantId: tenant.id, nom: "Plateforme", plateforme: "android" },
    });
  }

  const REMISE_ANNUELLE = 0.4; // §2.2 : -40% sur le forfait annuel vs 12x le mensuel
  const paliers = [
    { slug: "decouverte", nom: "Decouverte", prix: 0, plafond: 50 },
    { slug: "standard", nom: "Standard", prix: 25000, plafond: 500 },
    { slug: "croissance", nom: "Croissance", prix: 60000, plafond: 2000 },
    { slug: "echelle", nom: "Echelle", prix: 120000, plafond: Infinity },
  ];
  for (const palier of paliers) {
    const prixAnnuel = palier.prix === 0 ? 0 : Math.round(palier.prix * 12 * (1 - REMISE_ANNUELLE));
    await prisma.offre.upsert({
      where: { appId_slug: { appId: app.id, slug: palier.slug } },
      update: { prixAnnuel },
      create: {
        appId: app.id,
        nom: palier.nom,
        slug: palier.slug,
        prix: palier.prix,
        prixAnnuel,
        devise: "XAF",
        periodiciteJours: 30,
        toleranceJours: 7,
      },
    });
  }
  console.log("Tenant systeme 'Kola' seede (paliers de facturation, §2.2).");

  // --- Parametres tenant systeme -------------------------------------------
  for (const modele of MODELES_DEFAUT) {
    await prisma.modeleRelance.upsert({
      where: { tenantId_type_canal: { tenantId: tenant.id, type: modele.type, canal: "WHATSAPP" } },
      update: {},
      create: { tenantId: tenant.id, type: modele.type, canal: "WHATSAPP", contenu: modele.contenu },
    });
  }

  const campayAppId = process.env.CAMPAY_APP_USERNAME;
  const campayAppSecret = process.env.CAMPAY_APP_PASSWORD;
  if (campayAppId && campayAppSecret) {
    const configExistante = await prisma.configurationPaiement.findFirst({
      where: { tenantId: tenant.id, prestataire: "CAMPAY" },
    });
    if (!configExistante) {
      const identifiants = encrypt(JSON.stringify({ appUsername: campayAppId, appPassword: campayAppSecret }));
      const [iv, tag, data] = identifiants.split(":");
      await prisma.configurationPaiement.create({
        data: {
          tenantId: tenant.id,
          prestataire: "CAMPAY",
          nom: "Campay sandbox",
          identifiantsIv: iv,
          identifiantsTag: tag,
          identifiantsChiffres: data,
          parDefaut: true,
        },
      });
    }
  }

  console.log("Tenant.slug :", tenant.slug);
  console.log("App.cleApiPublique :", app.cleApiPublique);

  // --- Compte super-admin (seul utilisateur du seed) ----------------------
  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    let user = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!user) {
      await auth.api.signUpEmail({ body: { email: adminEmail, password: adminPassword, name: "Dieudonne" } });
      user = await prisma.user.findUnique({ where: { email: adminEmail } });
      console.log("Compte dashboard cree :", adminEmail);
    } else {
      console.log("Compte dashboard deja existant :", adminEmail);
    }

    if (user) {
      const dejaMembre = await prisma.member.findFirst({
        where: { organizationId: tenant.id, userId: user.id },
      });
      if (!dejaMembre) {
        await prisma.member.create({
          data: {
            id: randomUUID(),
            organizationId: tenant.id,
            userId: user.id,
            role: "proprietaire",
            createdAt: new Date(),
          },
        });
        console.log("Utilisateur rattache au tenant 'kola' en tant que proprietaire.");
      }
    }
  } else {
    console.log("SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD absents : compte dashboard non cree");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
