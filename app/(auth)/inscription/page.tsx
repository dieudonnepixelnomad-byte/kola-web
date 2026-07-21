"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { AuthShell, ChampTexte, BoutonPrincipal } from "../_AuthShell";

function slugify(nom: string): string {
  return (
    nom
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "tenant"
  );
}

export default function InscriptionPage() {
  const router = useRouter();
  const [nom, setNom] = useState("");
  const [nomEntreprise, setNomEntreprise] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setChargement(true);
    setErreur(null);

    const inscription = await authClient.signUp.email({ email, password, name: nom });
    if (inscription.error) {
      setErreur(inscription.error.message ?? "Impossible de creer le compte");
      setChargement(false);
      return;
    }

    const organisation = await authClient.organization.create({
      name: nomEntreprise,
      slug: `${slugify(nomEntreprise)}-${Math.random().toString(36).slice(2, 6)}`,
    });
    if (organisation.error || !organisation.data) {
      setErreur(organisation.error?.message ?? "Compte cree, mais impossible de creer le tenant");
      setChargement(false);
      return;
    }

    await authClient.organization.setActive({ organizationId: organisation.data.id });
    setChargement(false);
    router.push("/dashboard");
  }

  return (
    <AuthShell
      titre="Créer ton compte Kola"
      sousTitre="Un abonnement Mobile Money géré proprement, sans toucher au store."
    >
      <form onSubmit={handleSubmit} className="flex flex-col">
        <ChampTexte
          label="Ton nom"
          type="text"
          required
          value={nom}
          onChange={(e) => setNom(e.target.value)}
        />
        <ChampTexte
          label="Nom de ton entreprise / app"
          type="text"
          required
          value={nomEntreprise}
          onChange={(e) => setNomEntreprise(e.target.value)}
        />
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
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {erreur && <p className="mb-4 text-sm text-red-600">{erreur}</p>}
        <BoutonPrincipal type="submit" chargement={chargement}>
          Créer mon compte
        </BoutonPrincipal>
      </form>
      <p className="mt-6 text-center text-xs text-kola-muted-light">
        Déjà un compte ?{" "}
        <a href="/connexion" className="font-semibold text-kola-accent">
          Connecte-toi
        </a>
      </p>
    </AuthShell>
  );
}
