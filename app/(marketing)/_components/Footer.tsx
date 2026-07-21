export function Footer() {
  return (
    <footer className="border-t border-kola-border bg-white px-5 py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-kola-accent text-sm font-extrabold text-white">
            k
          </div>
          <span className="text-sm font-extrabold text-kola-text">Kola</span>
        </div>
        <nav className="flex flex-wrap items-center gap-5 text-xs font-semibold text-kola-muted">
          <a href="#tarifs" className="hover:text-kola-text">
            Tarifs
          </a>
          <a href="#faq" className="hover:text-kola-text">
            FAQ
          </a>
          <a href="/connexion" className="hover:text-kola-text">
            Connexion
          </a>
        </nav>
        <div className="flex items-center gap-3.5 text-kola-muted-light">
          <span aria-hidden>𝕏</span>
          <span aria-hidden>◎</span>
        </div>
      </div>
      <p className="mt-5 text-center text-[11px] text-kola-muted-light">
        © {new Date().getFullYear()} Kola. Aucune UI de paiement dans les apps de nos éditeurs — c&apos;est la règle.
      </p>
    </footer>
  );
}
