-- CreateEnum
CREATE TYPE "StatutAbonnement" AS ENUM ('ACTIF', 'TOLERANCE', 'COUPE', 'EXPIRE');

-- CreateEnum
CREATE TYPE "StatutTransaction" AS ENUM ('EN_ATTENTE', 'REUSSIE', 'ECHOUEE');

-- CreateEnum
CREATE TYPE "TypeRelance" AS ENUM ('J_MOINS_3', 'J_PLUS_7');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "cleApiPublique" TEXT NOT NULL,
    "cleApiPrivee" TEXT NOT NULL,
    "campayAppId" TEXT,
    "campayAppSecret" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "App" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "plateforme" TEXT NOT NULL DEFAULT 'android',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "App_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offre" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "prix" INTEGER NOT NULL,
    "devise" TEXT NOT NULL DEFAULT 'XAF',
    "periodiciteJours" INTEGER NOT NULL DEFAULT 30,
    "toleranceJours" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Offre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Abonne" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "identifiantExterne" TEXT NOT NULL,
    "telephone" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Abonne_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Abonnement" (
    "id" TEXT NOT NULL,
    "abonneId" TEXT NOT NULL,
    "offreId" TEXT NOT NULL,
    "statut" "StatutAbonnement" NOT NULL DEFAULT 'COUPE',
    "dateEcheance" TIMESTAMP(3),
    "dateActivation" TIMESTAMP(3),
    "lienPaiement" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Abonnement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "abonnementId" TEXT NOT NULL,
    "providerTransactionId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'campay',
    "montant" INTEGER NOT NULL,
    "statut" "StatutTransaction" NOT NULL DEFAULT 'EN_ATTENTE',
    "recuLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "traiteLe" TIMESTAMP(3),
    "payloadBrut" JSONB,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogRelance" (
    "id" TEXT NOT NULL,
    "abonnementId" TEXT NOT NULL,
    "type" "TypeRelance" NOT NULL,
    "envoyeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "canal" TEXT NOT NULL DEFAULT 'whatsapp_manuel',

    CONSTRAINT "LogRelance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_email_key" ON "Tenant"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_cleApiPublique_key" ON "Tenant"("cleApiPublique");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_cleApiPrivee_key" ON "Tenant"("cleApiPrivee");

-- CreateIndex
CREATE UNIQUE INDEX "Offre_appId_slug_key" ON "Offre"("appId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Abonne_tenantId_identifiantExterne_key" ON "Abonne"("tenantId", "identifiantExterne");

-- CreateIndex
CREATE UNIQUE INDEX "Abonnement_lienPaiement_key" ON "Abonnement"("lienPaiement");

-- CreateIndex
CREATE INDEX "Abonnement_statut_dateEcheance_idx" ON "Abonnement"("statut", "dateEcheance");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_providerTransactionId_key" ON "Transaction"("providerTransactionId");

-- AddForeignKey
ALTER TABLE "App" ADD CONSTRAINT "App_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offre" ADD CONSTRAINT "Offre_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Abonnement" ADD CONSTRAINT "Abonnement_abonneId_fkey" FOREIGN KEY ("abonneId") REFERENCES "Abonne"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Abonnement" ADD CONSTRAINT "Abonnement_offreId_fkey" FOREIGN KEY ("offreId") REFERENCES "Offre"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_abonnementId_fkey" FOREIGN KEY ("abonnementId") REFERENCES "Abonnement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogRelance" ADD CONSTRAINT "LogRelance_abonnementId_fkey" FOREIGN KEY ("abonnementId") REFERENCES "Abonnement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
