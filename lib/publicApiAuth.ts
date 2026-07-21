// Authentification de l'API publique REST (§9) : cle secrete de l'App
// (`Authorization: Bearer sk_...`), jamais la cle publique du SDK.
import { prisma } from "./prisma";
import { verifierSecret } from "./crypto";

export class PublicApiAuthError extends Error {
  constructor(public status: 401) {
    super("Cle API secrete invalide");
  }
}

export async function contexteApiPublique(req: Request): Promise<{ appId: string; tenantId: string }> {
  const header = req.headers.get("authorization");
  const cleSecrete = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
  if (!cleSecrete) throw new PublicApiAuthError(401);

  // La cle secrete ne porte pas l'App en clair : on ne peut pas la
  // retrouver par recherche indexee sur le hash sans connaitre l'App au
  // prealable -- on exige donc que l'appelant precise sa cleApiPublique en
  // en-tete complementaire pour resoudre l'App avant de verifier le secret.
  const clePublique = req.headers.get("x-kola-app");
  if (!clePublique) throw new PublicApiAuthError(401);

  const app = await prisma.app.findUnique({ where: { cleApiPublique: clePublique } });
  if (!app || !app.cleApiSecreteHash || !verifierSecret(cleSecrete, app.cleApiSecreteHash)) {
    throw new PublicApiAuthError(401);
  }

  return { appId: app.id, tenantId: app.tenantId };
}
