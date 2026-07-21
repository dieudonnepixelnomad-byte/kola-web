"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { AuthShell, ChampTexte, BoutonPrincipal } from "../_AuthShell";

export default function ConnexionPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setChargement(true);
    setErreur(null);
    const { error } = await authClient.signIn.email({ email, password });
    setChargement(false);
    if (error) {
      setErreur(error.message ?? "Identifiants invalides");
      return;
    }
    router.push("/dashboard");
  }

  return (
    <AuthShell titre="Content de te revoir 👋" sousTitre="Connecte-toi à ton tableau de bord Kola.">
      <form onSubmit={handleSubmit} className="flex flex-col">
        <ChampTexte
          label="Adresse e-mail"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <ChampTexte
          label="Mot de passe"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {erreur && <p className="mb-4 text-sm text-red-600">{erreur}</p>}
        <BoutonPrincipal type="submit" chargement={chargement}>
          Se connecter
        </BoutonPrincipal>
      </form>
      <p className="mt-6 text-center text-xs text-kola-muted-light">
        <a href="/mot-de-passe-oublie" className="font-semibold text-kola-accent">
          Mot de passe oublié ?
        </a>
        {" · "}
        <a href="/inscription" className="font-semibold text-kola-accent">
          Créer un compte
        </a>
      </p>
    </AuthShell>
  );
}
