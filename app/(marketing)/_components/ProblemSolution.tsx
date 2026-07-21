const PROBLEMES = [
  "Ton app ne peut pas utiliser Google Play Billing (pas de compte marchand éligible)",
  "Tu gères les renouvellements dans un tableur, à la main",
  "Tes abonnés oublient de payer et tu ne le sais qu'après coup",
  "Tu relances par copier-coller, quand tu y penses",
  "Un audit Play Store peut te faire recaler pour un bouton \"Payer\" mal placé",
];

const SOLUTIONS = [
  "Le paiement se fait hors app, via un lien WhatsApp — conforme Play Store",
  "Le statut de chaque abonné est recalculé chaque nuit, automatiquement",
  "Kola détecte l'échéance avant qu'elle arrive et prévient l'abonné",
  "Les relances J-3 / J+7 partent seules, au bon moment",
  "Le SDK ne propose jamais d'achat — juste une question : actif ou pas",
];

export function ProblemSolution() {
  return (
    <section className="border-b border-kola-border bg-white px-5 py-16">
      <div className="mx-auto max-w-5xl">
        <h2 className="mb-8 text-center text-2xl font-extrabold tracking-tight text-kola-text md:text-3xl">
          Gérer un abonnement Mobile Money à la main, ça ne tient pas
        </h2>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-kola-coupe-fg/20 bg-kola-coupe-bg p-6">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-kola-coupe-fg">Sans Kola</h3>
            <ul className="flex flex-col gap-3 text-[15px] text-kola-text">
              {PROBLEMES.map((p) => (
                <li key={p} className="flex gap-2.5">
                  <span className="mt-0.5 text-kola-coupe-fg">✕</span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-kola-actif-fg/20 bg-kola-actif-bg p-6">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-kola-actif-fg">Avec Kola</h3>
            <ul className="flex flex-col gap-3 text-[15px] text-kola-text">
              {SOLUTIONS.map((s) => (
                <li key={s} className="flex gap-2.5">
                  <span className="mt-0.5 text-kola-actif-fg">✓</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
