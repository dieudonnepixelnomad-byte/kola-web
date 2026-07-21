export function FounderStory() {
  return (
    <section className="border-b border-kola-border bg-white px-5 py-16">
      <div className="mx-auto grid max-w-4xl items-center gap-8 md:grid-cols-[220px_1fr]">
        <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-full bg-kola-cream text-sm font-semibold text-kola-muted-light md:mx-0">
          photo
        </div>
        <div>
          <h2 className="mb-3 text-xl font-extrabold tracking-tight text-kola-text md:text-2xl">
            Pourquoi j&apos;ai construit Kola
          </h2>
          <p className="leading-relaxed text-kola-text">
            J&apos;ai lancé une app au Cameroun sans pouvoir toucher à Google Play Billing — pas de compte marchand
            éligible dans mon pays. J&apos;ai fini par bricoler un suivi d&apos;abonnement Mobile Money à la main : un
            tableur, des relances manuelles, des dates ratées. Kola, c&apos;est ce système-là, propre, automatisé, et
            qui ne me demande jamais de toucher à l&apos;argent de mes abonnés. Je l&apos;ai construit pour mon app.
            Je le sors pour toutes les tiennes.
          </p>
        </div>
      </div>
    </section>
  );
}
