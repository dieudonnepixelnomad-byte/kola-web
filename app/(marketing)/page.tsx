import { prisma } from "@/lib/prisma";
import { Navbar } from "./_components/Navbar";
import { Hero } from "./_components/Hero";
import { ProblemSolution } from "./_components/ProblemSolution";
import { Testimonial } from "./_components/Testimonial";
import { TroisEtapes } from "./_components/TroisEtapes";
import { DemoVideo } from "./_components/DemoVideo";
import { FounderStory } from "./_components/FounderStory";
import { Pricing } from "./_components/Pricing";
import { Faq } from "./_components/Faq";
import { TestimonialWall } from "./_components/TestimonialWall";
import { Footer } from "./_components/Footer";

export default async function LandingPage() {
  const tenantSysteme = await prisma.tenant.findFirst({ where: { estSysteme: true } });
  const appPlateforme = tenantSysteme
    ? await prisma.app.findFirst({ where: { tenantId: tenantSysteme.id } })
    : null;
  const offres = appPlateforme
    ? await prisma.offre.findMany({
        where: { appId: appPlateforme.id },
        orderBy: { prix: "asc" },
        select: { nom: true, slug: true, prix: true, prixAnnuel: true, devise: true },
      })
    : [];

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <Hero />
      <ProblemSolution />
      <Testimonial
        citation="Je n'ai plus jamais raté un renouvellement."
        auteur="M. Fotso"
        role="Éditeur d'une app de streaming musical"
      />
      <TroisEtapes />
      <Testimonial
        citation="Mise en place en une après-midi, vraiment."
        auteur="A. Ngo"
        role="Éditeur d'une app d'apprentissage"
      />
      <DemoVideo />
      <Testimonial
        citation="Les relances automatiques ont doublé mon taux de renouvellement."
        auteur="R. Biya"
        role="Éditeur d'une app fitness"
      />
      <FounderStory />
      <Testimonial citation="Enfin conforme Play Store sans y penser." auteur="S. Talla" role="Éditeur d'une app de recettes" />
      {offres.length > 0 && <Pricing offres={offres} />}
      <Faq />
      <TestimonialWall />
      <Footer />
    </div>
  );
}
