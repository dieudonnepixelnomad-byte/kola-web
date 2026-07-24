"use client";

import { useState } from "react";

type Resultat = {
  lienPaiement: string;
  statutActuel: string;
  abonneExistaitDeja: boolean;
};

export function RechercheLienPaiement({ offreSlug }: { offreSlug: string }) {
  const [numero, setNumero] = useState("");
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [resultat, setResultat] = useState<Resultat | null>(null);
  const [copie, setCopie] = useState(false);

  async function handleRecherche() {
    if (!numero.trim()) return;
    setChargement(true);
    setErreur(null);
    setResultat(null);
    try {
      const res = await fetch(
        `/api/admin/lien-paiement?identifiantExterne=${encodeURIComponent(numero.trim())}&offre=${encodeURIComponent(offreSlug)}`
      );
      const data = await res.json();
      if (!res.ok) {
        setErreur(data.error ?? "Erreur");
        return;
      }
      setResultat(data);
    } catch {
      setErreur("Erreur reseau");
    } finally {
      setChargement(false);
    }
  }

  async function handleCopier() {
    if (!resultat) return;
    await navigator.clipboard.writeText(resultat.lienPaiement);
    setCopie(true);
    setTimeout(() => setCopie(false), 2000);
  }

  function handleWhatsApp() {
    if (!resultat) return;
    const message =
      `Bonjour, voici votre lien de paiement pour activer/renouveler votre abonnement :\n\n` +
      `${resultat.lienPaiement}\n\n` +
      `Procédure :\n` +
      `1. Ouvrez le lien ci-dessus\n` +
      `2. Choisissez votre moyen de paiement (Orange Money / MTN MoMo)\n` +
      `3. Confirmez le paiement en suivant les instructions à l'écran\n` +
      `4. Votre abonnement sera activé automatiquement après confirmation`;
    const numeroWhatsApp = numero.trim().replace(/[^\d]/g, "");
    window.open(
      `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(message)}`,
      "_blank"
    );
  }

  return (
    <div className="mb-3.5 rounded-2xl border border-kola-border bg-white px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={numero}
          onChange={(e) => setNumero(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleRecherche()}
          placeholder="+237671960300"
          className="min-w-[180px] flex-1 rounded-lg border border-kola-border-dark/60 px-3 py-1.5 text-[13px] font-mono"
        />
        <button
          onClick={handleRecherche}
          disabled={chargement}
          className="rounded-lg bg-kola-accent px-3.5 py-1.5 text-[12.5px] font-semibold text-white disabled:opacity-50"
        >
          {chargement ? "Recherche..." : "Trouver le lien"}
        </button>
        {erreur && <span className="text-[12.5px] font-semibold text-destructive">{erreur}</span>}
      </div>
      {resultat && (
        <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-kola-border pt-2.5 text-[12.5px]">
          <span className="break-all font-mono">{resultat.lienPaiement}</span>
          <span className="text-kola-muted-light">
            ({resultat.statutActuel}, {resultat.abonneExistaitDeja ? "abonné existant" : "nouvel abonné"})
          </span>
          <button
            onClick={handleCopier}
            className={
              "rounded-[9px] border px-3 py-1.5 text-xs font-bold transition-colors " +
              (copie
                ? "border-kola-accent bg-kola-actif-bg text-kola-accent-hover"
                : "border-kola-border bg-white text-kola-muted hover:border-kola-border-dark hover:text-kola-accent-hover")
            }
          >
            {copie ? "Copié ✓" : "Copier le lien"}
          </button>
          <button
            onClick={handleWhatsApp}
            className="rounded-[9px] border border-kola-border bg-white px-3 py-1.5 text-xs font-bold text-kola-muted transition-colors hover:border-kola-border-dark hover:text-kola-accent-hover"
          >
            Envoyer par WhatsApp
          </button>
        </div>
      )}
    </div>
  );
}
