"use client";

import { useState } from "react";

const OPERATEURS = [
  { key: "mtn" as const, name: "MTN MoMo", sub: "Mobile Money", abbr: "MTN", color: "#ffcb05", ink: "#1c1c00" },
  { key: "orange" as const, name: "Orange Money", sub: "Orange", abbr: "OM", color: "#ff6a00", ink: "#fff" },
];

export function PayForm({
  lienPaiement,
  telephoneInitial,
  offreNom,
  prix,
  devise,
  periodiciteJours,
}: {
  lienPaiement: string;
  telephoneInitial: string;
  offreNom: string;
  prix: number;
  devise: string;
  periodiciteJours: number;
}) {
  const [telephone, setTelephone] = useState(telephoneInitial);
  const [operateur, setOperateur] = useState<"mtn" | "orange">("mtn");
  const [statut, setStatut] = useState<"idle" | "envoi" | "attente" | "erreur">("idle");
  const [erreur, setErreur] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatut("envoi");
    setErreur(null);
    try {
      const res = await fetch("/api/pay/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lienPaiement, telephone, operateur }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Echec de l'initiation du paiement");
      }
      setStatut("attente");
    } catch (err) {
      setStatut("erreur");
      setErreur(err instanceof Error ? err.message : "Erreur inconnue");
    }
  }

  if (statut === "attente") {
    return (
      <div className="pt-1.5 text-center">
        <div className="relative mx-auto mb-6 h-[74px] w-[74px]">
          <div className="absolute inset-0 rounded-full border-[5px] border-kola-actif-bg" />
          <div className="absolute inset-0 animate-spin rounded-full border-[5px] border-kola-accent border-t-transparent" />
        </div>
        <h1 className="mb-2.5 text-xl font-extrabold tracking-tight">
          Confirme sur ton téléphone
        </h1>
        <p className="mx-auto mb-6.5 max-w-[26ch] text-sm leading-relaxed text-kola-muted">
          Compose <b className="font-mono text-kola-text">*126#</b> ou valide
          la demande {operateur === "mtn" ? "MTN MoMo" : "Orange Money"} reçue
          au <b className="font-mono">{telephone}</b>.
        </p>
        <div className="mb-5.5 flex items-center gap-3 rounded-2xl border border-kola-border bg-white p-3.5 text-left">
          <span className="h-2.5 w-2.5 flex-none animate-pulse rounded-full bg-[#e6a52b]" />
          <div>
            <div className="text-sm font-bold">Transaction en attente</div>
            <div className="font-mono text-[11.5px] text-kola-muted-light">
              campay · EN_ATTENTE
            </div>
          </div>
        </div>
        <button
          onClick={() => setStatut("idle")}
          className="w-full rounded-[13px] border border-kola-border-dark bg-transparent py-2.5 text-[13px] font-semibold text-kola-muted hover:text-kola-text"
        >
          Annuler
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="pt-1">
      <div className="mb-5 text-center">
        <p className="mb-1 text-[13px] text-kola-muted">Renouvelle ton accès</p>
        <h1 className="text-[22px] font-extrabold tracking-tight">{offreNom}</h1>
      </div>

      <div className="mb-5 rounded-[20px] bg-kola-forest p-5 text-center text-white">
        <div className="mb-1.5 text-xs font-semibold text-[#9fd3b6]">
          Montant à payer
        </div>
        <div className="text-[40px] font-extrabold leading-none tracking-tight">
          {prix} <span className="text-base font-semibold text-[#9fd3b6]">{devise}</span>
        </div>
        <div className="mt-2 text-xs text-[#8bbaa1]">
          Accès de {periodiciteJours} jours
        </div>
      </div>

      <label className="mb-2 block text-[13px] font-bold">
        Ton numéro Mobile Money
      </label>
      <input
        type="tel"
        required
        value={telephone}
        onChange={(e) => setTelephone(e.target.value)}
        placeholder="+237671960300"
        className="mb-4.5 w-full rounded-[13px] border border-kola-border-dark bg-white px-3.5 py-3 font-mono text-[15px] font-semibold outline-none focus:border-kola-accent focus:ring-4 focus:ring-kola-accent/15"
      />

      <label className="mb-2 block text-[13px] font-bold">Choisis ton opérateur</label>
      <div className="mb-5.5 grid grid-cols-2 gap-2.5">
        {OPERATEURS.map((o) => {
          const on = operateur === o.key;
          return (
            <button
              key={o.key}
              type="button"
              onClick={() => setOperateur(o.key)}
              className={
                "flex items-center gap-2.5 rounded-[14px] border-2 px-3 py-2.5 " +
                (on ? "border-kola-accent bg-[#f2fbf6]" : "border-kola-border bg-white")
              }
            >
              <span
                className="flex h-7.5 w-7.5 flex-none items-center justify-center rounded-lg text-[11px] font-extrabold"
                style={{ background: o.color, color: o.ink }}
              >
                {o.abbr}
              </span>
              <span className="text-left">
                <span className="block text-[13.5px] font-bold">{o.name}</span>
                <span className="block text-[11px] text-kola-muted-light">{o.sub}</span>
              </span>
              <span
                className="ml-auto flex h-4.5 w-4.5 flex-none items-center justify-center rounded-full border-2"
                style={{ borderColor: on ? "#12a05e" : "#ded6c6" }}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: on ? "#12a05e" : "transparent" }}
                />
              </span>
            </button>
          );
        })}
      </div>

      {erreur && <p className="mb-4 text-sm text-red-600">{erreur}</p>}

      <button
        type="submit"
        disabled={statut === "envoi"}
        className="w-full rounded-2xl bg-kola-accent py-3.5 text-base font-extrabold text-white shadow-[0_10px_22px_-8px_#12a05eaa] transition-colors hover:bg-kola-accent-hover disabled:opacity-50"
      >
        {statut === "envoi" ? "Envoi..." : `Payer ${prix} ${devise}`}
      </button>
      <p className="mt-4 text-center text-[11.5px] leading-relaxed text-kola-muted-light">
        Paiement encaissé via Campay directement sur le compte de
        l&apos;éditeur.
        <br />
        Kola ne touche jamais ton argent.
      </p>
    </form>
  );
}
