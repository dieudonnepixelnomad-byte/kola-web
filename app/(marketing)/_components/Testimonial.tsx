export function Testimonial({
  citation,
  auteur,
  role,
}: {
  citation: string;
  auteur: string;
  role: string;
}) {
  return (
    <div className="border-y border-kola-border bg-kola-cream px-5 py-8 text-center">
      <p className="mx-auto max-w-xl text-lg font-semibold italic leading-relaxed text-kola-text">
        &ldquo;{citation}&rdquo;
      </p>
      <div className="mt-3.5 flex items-center justify-center gap-2.5">
        <span className="h-8 w-8 rounded-full bg-kola-forest/15" />
        <div className="text-left text-xs">
          <div className="font-bold text-kola-text">{auteur}</div>
          <div className="text-kola-muted-light">{role}</div>
        </div>
      </div>
    </div>
  );
}
