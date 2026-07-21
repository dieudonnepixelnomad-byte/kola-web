import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { organization } from "better-auth/plugins";
import { prisma } from "./prisma";
import { creerTenantPourOrganisation } from "./tenant";
import { ac, proprietaire, admin, lecture } from "./permissions";

// Roles Kola : proprietaire (tout, y compris facturation/suppression), admin
// (offres/prestataires/abonnes/relances/webhooks, pas la facturation), lecture
// (consultation seule). Cf. docs/kola-web-cahier-des-charges.md §5.2.
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: { enabled: true },
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  basePath: "/api/admin/auth",
  plugins: [
    organization({
      ac,
      roles: { proprietaire, admin, lecture },
      creatorRole: "proprietaire",
      invitationExpiresIn: 60 * 60 * 24 * 7, // 7 jours
      organizationHooks: {
        afterCreateOrganization: async ({ organization }) => {
          await creerTenantPourOrganisation(organization.id, organization.name);
        },
      },
    }),
  ],
});
