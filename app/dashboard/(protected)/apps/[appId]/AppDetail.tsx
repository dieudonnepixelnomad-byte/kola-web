"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

type Offre = { id: string; nom: string; slug: string; prix: number; prixAnnuel: number | null; devise: string; actif: boolean };
type App = { id: string; nom: string; plateforme: string; cleApiPublique: string; offres: Offre[] };

export function AppDetail({ appId }: { appId: string }) {
  const [app, setApp] = useState<App | null>(null);
  const [ouvert, setOuvert] = useState(false);
  const [nom, setNom] = useState("");
  const [slug, setSlug] = useState("");
  const [prix, setPrix] = useState(0);
  const [remisePourcentageAnnuel, setRemisePourcentageAnnuel] = useState(0);
  const [envoi, setEnvoi] = useState(false);
  const [cleVisible, setCleVisible] = useState(false);
  const [regenerationEnCours, setRegenerationEnCours] = useState(false);
  const [copie, setCopie] = useState(false);

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
      body: JSON.stringify({ appId, nom, slug, prix, remisePourcentageAnnuel }),
    });
    setEnvoi(false);
    if (res.ok) {
      setNom("");
      setSlug("");
      setPrix(0);
      setRemisePourcentageAnnuel(0);
      setOuvert(false);
      charger();
    }
  }

  const prixAnnuelEstime = Math.round(prix * 12 * (1 - remisePourcentageAnnuel / 100));

  async function copierCle() {
    if (!app) return;
    await navigator.clipboard.writeText(app.cleApiPublique);
    setCopie(true);
    setTimeout(() => setCopie(false), 2000);
  }

  async function regenererCle() {
    if (!confirm("Regenerer la cle publique ? L'ancienne cessera de fonctionner immediatement.")) return;
    setRegenerationEnCours(true);
    const res = await fetch(`/api/admin/apps/${appId}/cle-publique`, { method: "POST" });
    setRegenerationEnCours(false);
    if (res.ok) {
      const data = await res.json();
      setApp((prev) => (prev ? { ...prev, cleApiPublique: data.cleApiPublique } : prev));
      setCleVisible(true);
    } else {
      alert("Regeneration impossible");
    }
  }

  if (!app)
    return (
      <div className="flex flex-col gap-5">
        <div>
          <Skeleton className="mb-2 h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-52 w-full rounded-2xl" />
      </div>
    );

  const snippet = `await Kola.init(\n  cleApiPublique: '${app.cleApiPublique}',\n  baseUrl: 'kola-web-zeta.vercel.app',\n);\n\nfinal actif = await Kola.isActive('${app.offres[0]?.slug ?? "premium"}', identifiantExterne: numero);`;

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
          <TabsTrigger value="parametres">Paramètres</TabsTrigger>
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
                    <Label className="mb-1.5 block">Prix mensuel (FCFA)</Label>
                    <Input type="number" value={prix} onChange={(e) => setPrix(Number(e.target.value))} required />
                  </div>
                  <div>
                    <Label className="mb-1.5 block">Remise annuelle (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={remisePourcentageAnnuel}
                      onChange={(e) => setRemisePourcentageAnnuel(Number(e.target.value))}
                    />
                  </div>
                  <div className="sm:col-span-2 flex items-end">
                    <p className="text-[13px] text-kola-muted">
                      Prix annuel estimé : <span className="font-semibold text-kola-text">{prixAnnuelEstime.toLocaleString("fr-FR")} FCFA</span>
                    </p>
                  </div>
                  <Button type="submit" disabled={envoi} className="sm:col-span-4 w-fit">
                    {envoi ? "Création..." : "Créer l'offre"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="overflow-hidden rounded-2xl border border-kola-border bg-white">
            <div className="grid grid-cols-[1fr_1fr_0.7fr_0.7fr_0.6fr] gap-3 border-b border-kola-border bg-[#faf7ef] px-4.5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#8b8474]">
              <div>Nom</div>
              <div>Slug</div>
              <div>Prix mensuel</div>
              <div>Prix annuel</div>
              <div>Statut</div>
            </div>
            {app.offres.map((o) => (
              <div key={o.id} className="grid grid-cols-[1fr_1fr_0.7fr_0.7fr_0.6fr] items-center gap-3 border-b border-[#f4efe4] px-4.5 py-3 last:border-b-0">
                <div className="font-semibold">{o.nom}</div>
                <div className="font-mono text-sm text-kola-muted">{o.slug}</div>
                <div className="text-sm">{o.prix.toLocaleString("fr-FR")} {o.devise}</div>
                <div className="text-sm">{o.prixAnnuel ? `${o.prixAnnuel.toLocaleString("fr-FR")} ${o.devise}` : "—"}</div>
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

        <TabsContent value="parametres">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Clé publique</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="text-[13.5px] text-kola-muted">
                Utilisée par le SDK Flutter pour identifier cette app. Regénère-la si elle a fuité.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 overflow-x-auto rounded-lg bg-muted px-3 py-2 font-mono text-xs">
                  {cleVisible ? app.cleApiPublique : "•".repeat(24)}
                </code>
                <Button size="sm" variant="outline" onClick={() => setCleVisible((v) => !v)}>
                  {cleVisible ? "Masquer" : "Afficher"}
                </Button>
                <Button size="sm" variant="outline" onClick={copierCle}>
                  {copie ? "Copié" : "Copier"}
                </Button>
              </div>
              <Button size="sm" variant="destructive" className="w-fit" disabled={regenerationEnCours} onClick={regenererCle}>
                {regenerationEnCours ? "Régénération..." : "Régénérer la clé"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
