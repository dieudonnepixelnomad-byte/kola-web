export function DemoVideo() {
  return (
    <section className="border-b border-kola-border bg-kola-cream-light px-5 py-16">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="mb-6 text-2xl font-extrabold tracking-tight text-kola-text md:text-3xl">
          Trois minutes pour tout comprendre
        </h2>
        <div className="group relative flex aspect-video items-center justify-center overflow-hidden rounded-2xl bg-kola-forest">
          <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_40%,#12a05e33,transparent)]" />
          <button
            type="button"
            aria-label="Lire la démo"
            className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white/95 text-kola-forest shadow-lg transition-transform group-hover:scale-105"
          >
            <span className="ml-1 text-2xl">▶</span>
          </button>
        </div>
      </div>
    </section>
  );
}
