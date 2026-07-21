import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const QUESTIONS = [
  {
    q: "Kola touche-t-il l'argent de mes abonnés ?",
    r: "Jamais. L'argent va directement du client final à ton compte Campay ou MeSomb. Kola ne détient aucun fonds, à aucun moment.",
  },
  {
    q: "Est-ce conforme aux règles de Google Play ?",
    r: "Oui — c'est la raison d'être de Kola. Le SDK Flutter ne propose jamais d'achat, de prix ou de bouton de paiement dans l'app. Tout le paiement se passe hors app, via un lien envoyé par WhatsApp.",
  },
  {
    q: "Quels prestataires de paiement sont supportés ?",
    r: "Campay et MeSomb dès aujourd'hui. PayDunya et Flutterwave arrivent, avec la même intégration côté SDK.",
  },
  {
    q: "Que se passe-t-il si je n'ai pas payé mon propre abonnement Kola ?",
    r: "Ton dashboard passe en lecture seule, mais tes abonnés à toi ne sont jamais coupés brutalement — la même tolérance qui protège leurs accès protège ton app en production.",
  },
  {
    q: "Puis-je exporter mes données si je pars ?",
    r: "À tout moment, en un clic. Tes abonnés sont à toi, exportables en CSV depuis le dashboard.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="border-b border-kola-border bg-white px-5 py-16">
      <div className="mx-auto max-w-2xl">
        <h2 className="mb-8 text-center text-2xl font-extrabold tracking-tight text-kola-text md:text-3xl">
          Foire aux questions
        </h2>
        <Accordion type="single" collapsible>
          {QUESTIONS.map((item, i) => (
            <AccordionItem key={item.q} value={`q-${i}`}>
              <AccordionTrigger className="text-left font-semibold text-kola-text">{item.q}</AccordionTrigger>
              <AccordionContent className="text-kola-muted">{item.r}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
