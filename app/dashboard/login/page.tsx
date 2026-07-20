"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export default function LoginPage() {
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
    <main className="grid min-h-screen grid-cols-1 md:grid-cols-[1.05fr_1fr]">
      <div className="relative hidden flex-col overflow-hidden bg-kola-forest p-14 text-white md:flex">
        <div
          className="pointer-events-none absolute -right-28 -top-28 h-80 w-80 rounded-full"
          style={{ background: "radial-gradient(circle, #12a05e33, transparent 70%)" }}
        />
        <div
          className="pointer-events-none absolute -bottom-24 right-10 h-64 w-64 rounded-full"
          style={{ background: "radial-gradient(circle, #12a05e22, transparent 70%)" }}
        />
        <div className="relative flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-kola-accent text-[22px] font-extrabold text-kola-forest-dark">
            k
          </div>
          <span className="text-[22px] font-extrabold tracking-tight">Kola</span>
        </div>

        <div className="relative mt-auto">
          <h1 className="mb-4 max-w-[15ch] text-[34px] font-extrabold leading-[1.18] tracking-tight">
            Sais si ton abonné a payé. Rien de plus.
          </h1>
          <p className="mb-7 max-w-[40ch] text-[15px] leading-relaxed text-[#bfe0cf]">
            Le tableau de bord des abonnements Mobile Money pour les apps qui
            ne peuvent pas encaisser via le store.
          </p>
          <div className="flex flex-col gap-3.5">
            {[
              "Renouvellements suivis automatiquement",
              "Relances prêtes à envoyer chaque matin",
              "Kola ne touche jamais ton argent",
            ].map((puce) => (
              <div key={puce} className="flex items-center gap-3 text-sm text-[#e4f2ea]">
                <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-kola-accent text-[11px] font-extrabold text-kola-forest-dark">
                  ✓
                </span>
                {puce}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center bg-kola-cream-light p-10">
        <div className="w-full max-w-[360px]">
          <h2 className="mb-1.5 text-2xl font-extrabold tracking-tight">
            Content de te revoir 👋
          </h2>
          <p className="mb-7 text-sm text-kola-muted">
            Connecte-toi à ton tableau de bord Kola.
          </p>
          <form onSubmit={handleSubmit} className="flex flex-col">
            <label className="mb-1.5 block text-[13px] font-semibold">
              Adresse e-mail
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mb-4 w-full rounded-xl border border-kola-border-dark bg-white px-3.5 py-3 text-sm text-kola-text outline-none focus:border-kola-accent focus:ring-4 focus:ring-kola-accent/15"
            />
            <label className="mb-1.5 block text-[13px] font-semibold">
              Mot de passe
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mb-5 w-full rounded-xl border border-kola-border-dark bg-white px-3.5 py-3 text-sm text-kola-text outline-none focus:border-kola-accent focus:ring-4 focus:ring-kola-accent/15"
            />
            {erreur && <p className="mb-4 text-sm text-red-600">{erreur}</p>}
            <button
              type="submit"
              disabled={chargement}
              className="w-full rounded-xl bg-kola-accent px-4 py-3.5 text-[15px] font-bold text-white shadow-[0_6px_16px_-6px_#12a05e88] transition-colors hover:bg-kola-accent-hover disabled:opacity-50"
            >
              {chargement ? "Connexion..." : "Se connecter"}
            </button>
          </form>
          <p className="mt-6 text-center text-xs text-kola-muted-light">
            Compte unique · usage interne du MVP
          </p>
        </div>
      </div>
    </main>
  );
}
