import "dotenv/config";
import { prisma } from "../lib/prisma";
import { encrypt } from "../lib/crypto";
import { auth } from "../lib/auth";

async function main() {
  const campayAppId = process.env.CAMPAY_APP_USERNAME;
  const campayAppSecret = process.env.CAMPAY_APP_PASSWORD;

  const tenant = await prisma.tenant.upsert({
    where: { email: "dieudonnepixelnomad@gmail.com" },
    update: {},
    create: {
      nom: "Dieudonne",
      email: "dieudonnepixelnomad@gmail.com",
      campayAppId: campayAppId ? encrypt(campayAppId) : null,
      campayAppSecret: campayAppSecret ? encrypt(campayAppSecret) : null,
    },
  });

  let app = await prisma.app.findFirst({ where: { tenantId: tenant.id, nom: "Kola Test App" } });
  if (!app) {
    app = await prisma.app.create({
      data: { tenantId: tenant.id, nom: "Kola Test App", plateforme: "android" },
    });
  }

  const offre = await prisma.offre.upsert({
    where: { appId_slug: { appId: app.id, slug: "premium" } },
    update: {},
    create: {
      appId: app.id,
      nom: "Premium",
      slug: "premium",
      prix: 100,
      devise: "XAF",
      periodiciteJours: 30,
      toleranceJours: 3,
    },
  });

  const identifiantExterne = "+237671960300";
  const abonne = await prisma.abonne.upsert({
    where: { tenantId_identifiantExterne: { tenantId: tenant.id, identifiantExterne } },
    update: {},
    create: { tenantId: tenant.id, identifiantExterne, telephone: identifiantExterne },
  });

  let abonnement = await prisma.abonnement.findFirst({ where: { abonneId: abonne.id, offreId: offre.id } });
  if (!abonnement) {
    abonnement = await prisma.abonnement.create({
      data: { abonneId: abonne.id, offreId: offre.id, statut: "COUPE" },
    });
  }

  console.log("Tenant.cleApiPublique :", tenant.cleApiPublique);
  console.log("Abonnement.lienPaiement :", abonnement.lienPaiement);
  console.log("Abonne.identifiantExterne :", abonne.identifiantExterne);
  console.log("Offre.slug :", offre.slug);

  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    const dejaExistant = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!dejaExistant) {
      await auth.api.signUpEmail({
        body: { email: adminEmail, password: adminPassword, name: "Dieudonne" },
      });
      console.log("Compte dashboard cree :", adminEmail);
    } else {
      console.log("Compte dashboard deja existant :", adminEmail);
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
