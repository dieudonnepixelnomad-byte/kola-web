-- CreateEnum
CREATE TYPE "PrestataireType" AS ENUM ('CAMPAY', 'MESOMB', 'PAYDUNYA', 'FLUTTERWAVE');

-- CreateEnum
CREATE TYPE "CanalRelance" AS ENUM ('WHATSAPP', 'SMS', 'EMAIL');

-- AlterEnum
ALTER TYPE "TypeRelance" ADD VALUE 'J_ECHEANCE';

-- DropIndex
DROP INDEX "Tenant_cleApiPrivee_key";

-- DropIndex
DROP INDEX "Tenant_cleApiPublique_key";

-- DropIndex
DROP INDEX "Tenant_email_key";

-- DropIndex
DROP INDEX "Transaction_providerTransactionId_key";

-- AlterTable
ALTER TABLE "App" ADD COLUMN     "cleApiPublique" TEXT NOT NULL,
ADD COLUMN     "cleApiSecreteHash" TEXT,
ADD COLUMN     "cleApiSecreteIndice" TEXT;

-- AlterTable
ALTER TABLE "LogRelance" ADD COLUMN     "erreur" TEXT,
ADD COLUMN     "statutEnvoi" TEXT NOT NULL DEFAULT 'ENVOYE',
DROP COLUMN "canal",
ADD COLUMN     "canal" "CanalRelance" NOT NULL DEFAULT 'WHATSAPP';

-- AlterTable
ALTER TABLE "Offre" ADD COLUMN     "actif" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "configurationId" TEXT;

-- AlterTable
ALTER TABLE "Tenant" DROP COLUMN "campayAppId",
DROP COLUMN "campayAppSecret",
DROP COLUMN "cleApiPrivee",
DROP COLUMN "cleApiPublique",
DROP COLUMN "email",
ADD COLUMN     "estSysteme" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "slug" TEXT NOT NULL,
ADD COLUMN     "statutPlateforme" "StatutAbonnement" NOT NULL DEFAULT 'ACTIF';

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "reference" TEXT NOT NULL,
ALTER COLUMN "providerTransactionId" DROP NOT NULL,
DROP COLUMN "provider",
ADD COLUMN     "provider" "PrestataireType" NOT NULL DEFAULT 'CAMPAY';

-- AlterTable
ALTER TABLE "session" ADD COLUMN     "activeOrganizationId" TEXT;

-- CreateTable
CREATE TABLE "ConfigurationPaiement" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "prestataire" "PrestataireType" NOT NULL,
    "nom" TEXT NOT NULL,
    "identifiantsChiffres" TEXT NOT NULL,
    "identifiantsIv" TEXT NOT NULL,
    "identifiantsTag" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "parDefaut" BOOLEAN NOT NULL DEFAULT false,
    "verifieLe" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConfigurationPaiement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModeleRelance" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "TypeRelance" NOT NULL,
    "canal" "CanalRelance" NOT NULL DEFAULT 'WHATSAPP',
    "contenu" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModeleRelance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookSortant" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "evenements" TEXT[],
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookSortant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LivraisonWebhook" (
    "id" TEXT NOT NULL,
    "webhookSortantId" TEXT NOT NULL,
    "evenement" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "statutHttp" INTEGER,
    "tentatives" INTEGER NOT NULL DEFAULT 0,
    "livreLe" TIMESTAMP(3),
    "prochainEssai" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LivraisonWebhook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalAudit" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "utilisateurId" TEXT,
    "action" TEXT NOT NULL,
    "cible" TEXT,
    "meta" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JournalAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "metadata" TEXT,

    CONSTRAINT "organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inviterId" TEXT NOT NULL,

    CONSTRAINT "invitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConfigurationPaiement_tenantId_idx" ON "ConfigurationPaiement"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ModeleRelance_tenantId_type_canal_key" ON "ModeleRelance"("tenantId", "type", "canal");

-- CreateIndex
CREATE INDEX "WebhookSortant_tenantId_idx" ON "WebhookSortant"("tenantId");

-- CreateIndex
CREATE INDEX "LivraisonWebhook_prochainEssai_idx" ON "LivraisonWebhook"("prochainEssai");

-- CreateIndex
CREATE INDEX "JournalAudit_tenantId_createdAt_idx" ON "JournalAudit"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "organization_slug_key" ON "organization"("slug");

-- CreateIndex
CREATE INDEX "member_organizationId_idx" ON "member"("organizationId");

-- CreateIndex
CREATE INDEX "member_userId_idx" ON "member"("userId");

-- CreateIndex
CREATE INDEX "invitation_organizationId_idx" ON "invitation"("organizationId");

-- CreateIndex
CREATE INDEX "invitation_email_idx" ON "invitation"("email");

-- CreateIndex
CREATE UNIQUE INDEX "App_cleApiPublique_key" ON "App"("cleApiPublique");

-- CreateIndex
CREATE UNIQUE INDEX "App_cleApiSecreteHash_key" ON "App"("cleApiSecreteHash");

-- CreateIndex
CREATE INDEX "App_tenantId_idx" ON "App"("tenantId");

-- CreateIndex
CREATE INDEX "LogRelance_abonnementId_type_idx" ON "LogRelance"("abonnementId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_reference_key" ON "Transaction"("reference");

-- CreateIndex
CREATE INDEX "Transaction_statut_recuLe_idx" ON "Transaction"("statut", "recuLe");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_provider_providerTransactionId_key" ON "Transaction"("provider", "providerTransactionId");

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_id_fkey" FOREIGN KEY ("id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfigurationPaiement" ADD CONSTRAINT "ConfigurationPaiement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offre" ADD CONSTRAINT "Offre_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "ConfigurationPaiement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModeleRelance" ADD CONSTRAINT "ModeleRelance_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookSortant" ADD CONSTRAINT "WebhookSortant_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LivraisonWebhook" ADD CONSTRAINT "LivraisonWebhook_webhookSortantId_fkey" FOREIGN KEY ("webhookSortantId") REFERENCES "WebhookSortant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalAudit" ADD CONSTRAINT "JournalAudit_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member" ADD CONSTRAINT "member_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member" ADD CONSTRAINT "member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

