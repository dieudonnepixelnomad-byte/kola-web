"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Offre = { id: string; nom: string; slug: string; prix: number; devise: string; actif: boolean };
type App = { id: string; nom: string; plateforme: string; cleApiPublique: string; offres: Offre[] };

export function AppDetail({ appId }: { appId: string }) {
  const [app, setApp] = useState<App | null>(null);
  const [ouvert, setOuvert] = useState(false);
  const [nom, setNom] = useState("");
  const [slug, setSlug] = useState("");
  const [prix, setPrix] = useState(0);
  const [envoi, setEnvoi] = useState(false);

  async function charger() {
    const res = await fetch(`/api/admin/apps/${appId}`);
    if (res.ok) setApp((await res.json()).app);
  }

  useEffect(() => {
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId]);

  async function creerOffre(e: React.FormEvent) {
    e.preventDefault();
    setEnvoi(true);
    const res = await fetch("/api/admin/offres", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appId, nom, slug, prix }),
    });
    setEnvoi(false);
    if (res.ok) {
      setNom("");
      setSlug("");
      setPrix(0);
      setOuvert(false);
      charger();
    }
  }

  if (!app) return <p className="text-sm text-kola-muted">Chargement...</p>;

  const snippet = `await Kola.init(\n  cleApiPublique: '${app.cleApiPublique}',\n  baseUrl: 'https://ton-domaine-kola.vercel.app',\n);\n\nfinal actif = await Kola.isActive('${app.offres[0]?.slug ?? "premium"}', identifiantExterne: numero);`;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[23px] font-extrabold tracking-tight">{app.nom}</h1>
          <p className="text-[13.5px] text-kola-muted">{app.plateforme}</p>
        </div>
      </div>

      <Tabs defaultValue="offres">
        <TabsList>
          <TabsTrigger value="offres">Offres</TabsTrigger>
          <TabsTrigger value="sdk">Intégration SDK</TabsTrigger>
        </TabsList>

        <TabsContent value="offres" className="flex flex-col gap-4">
          <Button className="w-fit" onClick={() => setOuvert((o) => !o)}>
            {ouvert ? "Annuler" : "Ajouter une offre"}
          </Button>

          {ouvert && (
            <Card>
              <CardContent className="pt-6">
                <form onSubmit={creerOffre} className="grid gap-3 sm:grid-cols-4">
                  <div className="sm:col-span-2">
                    <Label className="mb-1.5 block">Nom</Label>
                    <Input value={nom} onChange={(e) => setNom(e.target.value)} required placeholder="Premium mensuel" />
                  </div>
                  <div>
                    <Label className="mb-1.5 block">Slug</Label>
                    <Input value={slug} onChange={(e) => setSlug(e.target.value)} required placeholder="premium" />
                  </div>
                  <div>
                    <Label className="mb-1.5 block">Prix (FCFA)</Label>
                    <Input type="number" value={prix} onChange={(e) => setPrix(Number(e.target.value))} required />
                  </div>
                  <Button type="submit" disabled={envoi} className="sm:col-span-4 w-fit">
                    {envoi ? "Création..." : "Créer l'offre"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="overflow-hidden rounded-2xl border border-kola-border bg-white">
            <div className="grid grid-cols-[1fr_1fr_0.6fr_0.6fr] gap-3 border-b border-kola-border bg-[#faf7ef] px-4.5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#8b8474]">
              <div>Nom</div>
              <div>Slug</div>
              <div>Prix</div>
              <div>Statut</div>
            </div>
            {app.offres.map((o) => (
              <div key={o.id} className="grid grid-cols-[1fr_1fr_0.6fr_0.6fr] items-center gap-3 border-b border-[#f4efe4] px-4.5 py-3 last:border-b-0">
                <div className="font-semibold">{o.nom}</div>
                <div className="font-mono text-sm text-kola-muted">{o.slug}</div>
                <div className="text-sm">{o.prix.toLocaleString("fr-FR")} {o.devise}</div>
                <div>
                  <Badge variant={o.actif ? "default" : "secondary"}>{o.actif ? "Actif" : "Inactif"}</Badge>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="sdk">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Snippet prêt à copier</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="overflow-x-auto rounded-xl bg-kola-forest p-4 text-xs text-[#dcefe4]">{snippet}</pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
