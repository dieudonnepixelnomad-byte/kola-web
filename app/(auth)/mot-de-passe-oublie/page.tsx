"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { AuthShell, ChampTexte, BoutonPrincipal } from "../_AuthShell";

export default function MotDePasseOubliePage() {
  const [email, setEmail] = useState("");
  const [envoye, setEnvoye] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setChargement(true);
    setErreur(null);
    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: "/reinitialiser-mot-de-passe",
    });
    setChargement(false);
    if (error) {
      setErreur(error.message ?? "Impossible d'envoyer l'e-mail");
      return;
    }
    setEnvoye(true);
  }

  return (
    <AuthShell titre="Mot de passe oublié" sousTitre="On t'envoie un lien de réinitialisation par e-mail.">
      {envoye ? (
        <p className="text-sm text-kola-text">
          Si un compte existe pour <strong>{email}</strong>, un lien de réinitialisation vient d&apos;être envoyé.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col">
          <ChampTexte
            label="Adresse e-mail"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {erreur && <p className="mb-4 text-sm text-red-600">{erreur}</p>}
          <BoutonPrincipal type="submit" chargement={chargement}>
            Envoyer le lien
          </BoutonPrincipal>
        </form>
      )}
      <p className="mt-6 text-center text-xs text-kola-muted-light">
        <a href="/connexion" className="font-semibold text-kola-accent">
          Retour à la connexion
        </a>
      </p>
    </AuthShell>
  );
}
