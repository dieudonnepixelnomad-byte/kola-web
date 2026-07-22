import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { contexteTenant, TenantAuthError } from "@/lib/tenant";
import { Sidebar } from "./Sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/connexion");
  }

  let ctx;
  try {
    ctx = await contexteTenant();
  } catch (e) {
    if (e instanceof TenantAuthError) redirect("/inscription");
    throw e;
  }

  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: ctx.tenantId } });
  const enLectureSeule = tenant.statutPlateforme === "COUPE" || tenant.statutPlateforme === "EXPIRE";

  const providerActif = await prisma.configurationPaiement.findFirst({
    where: { tenantId: ctx.tenantId, actif: true, parDefaut: true },
    select: { prestataire: true },
  });

  return (
    <div className="grid min-h-screen grid-cols-[232px_1fr]">
      <Sidebar
        userName={session.user.name ?? session.user.email}
        tenantNom={tenant.nom}
        provider={providerActif?.prestataire ?? null}
      />
      <main className="overflow-auto bg-kola-cream-light p-7">
        {enLectureSeule && (
          <div className="mb-5 rounded-xl border border-kola-coupe-fg/30 bg-kola-coupe-bg px-4 py-3 text-sm font-semibold text-kola-coupe-fg">
            Ton abonnement Kola est en pause. Le tableau de bord est en lecture seule —{" "}
            <a href="/dashboard/parametres/facturation" className="underline">
              renouvelle ici
            </a>{" "}
            pour reprendre la main. Tes propres abonnés ne sont pas affectés.
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
