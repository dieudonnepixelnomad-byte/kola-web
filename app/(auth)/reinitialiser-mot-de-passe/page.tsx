"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { AuthShell, ChampTexte, BoutonPrincipal } from "../_AuthShell";

function ReinitialiserMotDePasseForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [motDePasse, setMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);
  const [reussi, setReussi] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);

    if (!token) {
      setErreur("Lien invalide ou expiré.");
      return;
    }
    if (motDePasse !== confirmation) {
      setErreur("Les mots de passe ne correspondent pas.");
      return;
    }

    setChargement(true);
    const { error } = await authClient.resetPassword({
      newPassword: motDePasse,
      token,
    });
    setChargement(false);

    if (error) {
      setErreur(error.message ?? "Impossible de réinitialiser le mot de passe.");
      return;
    }
    setReussi(true);
    setTimeout(() => router.push("/connexion"), 1500);
  }

  if (!token) {
    return <p className="text-sm text-red-600">Lien invalide ou expiré. Redemande un lien depuis la page « mot de passe oublié ».</p>;
  }

  return (
    <>
      {reussi ? (
        <p className="text-sm text-kola-text">Mot de passe mis à jour. Redirection vers la connexion...</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col">
          <ChampTexte
            label="Nouveau mot de passe"
            type="password"
            required
            minLength={8}
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
          />
          <ChampTexte
            label="Confirmer le mot de passe"
            type="password"
            required
            minLength={8}
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
          />
          {erreur && <p className="mb-4 text-sm text-red-600">{erreur}</p>}
          <BoutonPrincipal type="submit" chargement={chargement}>
            Réinitialiser le mot de passe
          </BoutonPrincipal>
        </form>
      )}
    </>
  );
}

export default function ReinitialiserMotDePassePage() {
  return (
    <AuthShell titre="Nouveau mot de passe" sousTitre="Choisis un nouveau mot de passe pour ton compte.">
      <Suspense fallback={null}>
        <ReinitialiserMotDePasseForm />
      </Suspense>
      <p className="mt-6 text-center text-xs text-kola-muted-light">
        <a href="/connexion" className="font-semibold text-kola-accent">
          Retour à la connexion
        </a>
      </p>
    </AuthShell>
  );
}
