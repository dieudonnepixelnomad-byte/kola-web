"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type App = {
  id: string;
  nom: string;
  plateforme: string;
  cleApiPublique: string;
  offres: { id: string; nom: string; slug: string; actif: boolean }[];
};

export function AppsListe() {
  const [apps, setApps] = useState<App[]>([]);
  const [chargement, setChargement] = useState(true);
  const [ouvert, setOuvert] = useState(false);
  const [nom, setNom] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [cleCreee, setCleCreee] = useState<{ cleApiPublique: string; cleApiSecrete: string } | null>(null);
  const [suppressionId, setSuppressionId] = useState<string | null>(null);

  async function charger() {
    setChargement(true);
    const res = await fetch("/api/admin/apps");
    if (res.ok) setApps((await res.json()).apps);
    setChargement(false);
  }

  useEffect(() => {
    charger();
  }, []);

  async function creer(e: React.FormEvent) {
    e.preventDefault();
    setEnvoi(true);
    const res = await fetch("/api/admin/apps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom, plateforme: "android" }),
    });
    setEnvoi(false);
    if (res.ok) {
      const data = await res.json();
      setCleCreee({ cleApiPublique: data.cleApiPublique, cleApiSecrete: data.cleApiSecrete });
      setNom("");
      setOuvert(false);
      charger();
    }
  }

  async function supprimer(e: React.MouseEvent, appId: string) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Supprimer cette app ? Cette action est irreversible.")) return;
    setSuppressionId(appId);
    const res = await fetch(`/api/admin/apps/${appId}`, { method: "DELETE" });
    setSuppressionId(null);
    if (res.ok) {
      charger();
    } else {
      const data = await res.json().catch(() => null);
      alert(data?.error ?? "Suppression impossible");
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[23px] font-extrabold tracking-tight">Applications</h1>
          <p className="text-[13.5px] text-kola-muted">Une App par produit mobile, chacune avec ses offres et ses clés.</p>
        </div>
        <Button onClick={() => setOuvert((o) => !o)}>{ouvert ? "Annuler" : "Créer une app"}</Button>
      </div>

      {cleCreee && (
        <Card className="border-kola-accent/40 bg-kola-actif-bg">
          <CardHeader>
            <CardTitle className="text-base">Clé secrète — à copier maintenant</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <p className="text-kola-text">
              Cette clé secrète ne sera plus jamais affichée. Copie-la dans ton backend si tu utilises l&apos;API publique.
            </p>
            <code className="rounded-lg bg-white px-3 py-2 font-mono text-xs">{cleCreee.cleApiSecrete}</code>
            <Button size="sm" variant="outline" onClick={() => setCleCreee(null)}>
              J&apos;ai copié la clé
            </Button>
          </CardContent>
        </Card>
      )}

      {ouvert && (
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={creer} className="flex items-end gap-3">
              <div className="flex-1">
                <Label className="mb-1.5 block">Nom de l&apos;app</Label>
                <Input value={nom} onChange={(e) => setNom(e.target.value)} required placeholder="Ex : Mon App Android" />
              </div>
              <Button type="submit" disabled={envoi}>
                {envoi ? "Création..." : "Créer"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {!chargement && apps.length === 0 && <p className="text-sm text-kola-muted">Aucune app pour l&apos;instant.</p>}

      {chargement && (
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-40" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {apps.map((app) => (
          <Link key={app.id} href={`/dashboard/apps/${app.id}`}>
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  {app.nom}
                  <Badge variant="secondary">{app.plateforme}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm text-kola-muted">
                <p>{app.offres.length} offre(s)</p>
                <code className="rounded bg-muted px-2 py-1 font-mono text-xs break-all">{app.cleApiPublique}</code>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={suppressionId === app.id}
                  onClick={(e) => supprimer(e, app.id)}
                >
                  {suppressionId === app.id ? "Suppression..." : "Supprimer"}
                </Button>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
