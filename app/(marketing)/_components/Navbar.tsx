import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-kola-border bg-kola-cream-light/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link href="#" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-kola-accent text-[17px] font-extrabold text-white">
            k
          </div>
          <span className="text-lg font-extrabold tracking-tight text-kola-text">Kola</span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-semibold text-kola-muted md:flex">
          <a href="#temoignages" className="hover:text-kola-text">
            Témoignages
          </a>
          <a href="#tarifs" className="hover:text-kola-text">
            Tarifs
          </a>
          <a href="#faq" className="hover:text-kola-text">
            FAQ
          </a>
        </nav>

        <Button asChild className="rounded-full px-5">
          <Link href="/inscription">Commencer gratuitement</Link>
        </Button>
      </div>
    </header>
  );
}
