import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AuthShell } from "../../_AuthShell";
import { AccepterInvitation } from "./AccepterInvitation";

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const invitation = await prisma.invitation.findUnique({
    where: { id: token },
    include: { organization: true },
  });

  if (!invitation || invitation.status !== "pending" || invitation.expiresAt < new Date()) {
    return (
      <AuthShell titre="Invitation invalide" sousTitre="Ce lien d'invitation est invalide ou a expiré.">
        <a href="/connexion" className="text-sm font-semibold text-kola-accent">
          Retour à la connexion
        </a>
      </AuthShell>
    );
  }

  const session = await auth.api.getSession({ headers: await headers() });

  return (
    <AuthShell
      titre={`Rejoindre ${invitation.organization.name}`}
      sousTitre={`Tu as été invité(e) en tant que ${invitation.role ?? "membre"} sur Kola.`}
    >
      {session ? (
        session.user.email === invitation.email ? (
          <AccepterInvitation invitationId={invitation.id} />
        ) : (
          <p className="text-sm text-kola-text">
            Cette invitation est destinée à <strong>{invitation.email}</strong>, mais tu es connecté(e) en tant que{" "}
            {session.user.email}. Déconnecte-toi puis reviens sur ce lien.
          </p>
        )
      ) : (
        <div>
          <p className="mb-4 text-sm text-kola-text">
            Connecte-toi ou crée un compte avec <strong>{invitation.email}</strong> pour accepter cette invitation.
          </p>
          <a
            href={`/connexion?redirect=/invitation/${token}`}
            className="mb-2.5 block w-full rounded-xl bg-kola-accent px-4 py-3.5 text-center text-[15px] font-bold text-white hover:bg-kola-accent-hover"
          >
            Se connecter
          </a>
          <a
            href={`/inscription?redirect=/invitation/${token}`}
            className="block w-full rounded-xl border border-kola-border-dark px-4 py-3.5 text-center text-[15px] font-bold text-kola-text hover:border-kola-accent"
          >
            Créer un compte
          </a>
        </div>
      )}
    </AuthShell>
  );
}
