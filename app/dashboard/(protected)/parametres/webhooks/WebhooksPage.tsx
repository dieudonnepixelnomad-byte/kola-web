"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const EVENEMENTS = ["abonnement.active", "abonnement.tolerance", "abonnement.coupe", "abonnement.expire", "transaction.reussie"];

type Webhook = { id: string; url: string; evenements: string[]; actif: boolean };

export function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [ouvert, setOuvert] = useState(false);
  const [url, setUrl] = useState("");
  const [evenements, setEvenements] = useState<string[]>([]);
  const [secretAffiche, setSecretAffiche] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  async function charger() {
    const res = await fetch("/api/admin/webhooks");
    if (res.ok) setWebhooks((await res.json()).webhooks);
  }

  useEffect(() => {
    charger();
  }, []);

  function toggleEvenement(e: string) {
    setEvenements((prev) => (prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]));
  }

  async function creer(e: React.FormEvent) {
    e.preventDefault();
    setEnvoi(true);
    const res = await fetch("/api/admin/webhooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, evenements }),
    });
    setEnvoi(false);
    if (res.ok) {
      const data = await res.json();
      setSecretAffiche(data.secret);
      setUrl("");
      setEvenements([]);
      setOuvert(false);
      charger();
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[23px] font-extrabold tracking-tight">Webhooks sortants</h1>
          <p className="text-[13.5px] text-kola-muted">Reçois un POST signé à chaque événement d&apos;abonnement.</p>
        </div>
        <Button onClick={() => setOuvert((o) => !o)}>{ouvert ? "Annuler" : "Ajouter un webhook"}</Button>
      </div>

      {secretAffiche && (
        <Card className="border-kola-accent/40 bg-kola-actif-bg">
          <CardContent className="flex flex-col gap-2 pt-6 text-sm">
            <p>Ce secret de signature (HMAC-SHA256, header X-Kola-Signature) ne sera plus jamais affiché.</p>
            <code className="rounded-lg bg-white px-3 py-2 font-mono text-xs">{secretAffiche}</code>
            <Button size="sm" variant="outline" onClick={() => setSecretAffiche(null)}>
              J&apos;ai copié le secret
            </Button>
          </CardContent>
        </Card>
      )}

      {ouvert && (
        <Card>
          <CardContent className="flex flex-col gap-4 pt-6">
            <form onSubmit={creer} className="flex flex-col gap-4">
              <div>
                <Label className="mb-1.5 block">URL</Label>
                <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://mon-backend.com/webhooks/kola" required />
              </div>
              <div>
                <Label className="mb-1.5 block">Événements</Label>
                <div className="flex flex-wrap gap-2">
                  {EVENEMENTS.map((ev) => (
                    <button
                      type="button"
                      key={ev}
                      onClick={() => toggleEvenement(ev)}
                      className={
                        "rounded-full border px-3 py-1 text-xs font-semibold " +
                        (evenements.includes(ev) ? "border-kola-accent bg-kola-accent text-white" : "border-kola-border-dark text-kola-muted")
                      }
                    >
                      {ev}
                    </button>
                  ))}
                </div>
              </div>
              <Button type="submit" disabled={envoi || evenements.length === 0} className="w-fit">
                {envoi ? "Création..." : "Créer le webhook"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="overflow-hidden rounded-2xl border border-kola-border bg-white">
        {webhooks.length === 0 && <div className="px-4.5 py-6 text-sm text-kola-muted">Aucun webhook configuré.</div>}
        {webhooks.map((w) => (
          <div key={w.id} className="flex flex-col gap-1.5 border-b border-[#f4efe4] px-4.5 py-3 last:border-b-0">
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm">{w.url}</span>
              <Badge variant={w.actif ? "default" : "secondary"}>{w.actif ? "Actif" : "Inactif"}</Badge>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {w.evenements.map((e) => (
                <Badge key={e} variant="outline" className="text-[10px]">
                  {e}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
