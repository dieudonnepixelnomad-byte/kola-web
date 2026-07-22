"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type Prestataire = "CAMPAY" | "MESOMB" | "PAYDUNYA" | "FLUTTERWAVE";

type Config = {
  id: string;
  prestataire: Prestataire;
  nom: string;
  actif: boolean;
  parDefaut: boolean;
  verifieLe: string | null;
};

const CHAMPS: Record<Prestataire, { key: string; label: string }[]> = {
  CAMPAY: [
    { key: "appUsername", label: "App Username" },
    { key: "appPassword", label: "App Password" },
    { key: "webhookSecret", label: "Webhook secret (optionnel)" },
  ],
  MESOMB: [
    { key: "applicationKey", label: "Application Key" },
    { key: "accessKey", label: "Access Key" },
    { key: "secretKey", label: "Secret Key" },
  ],
  PAYDUNYA: [
    { key: "masterKey", label: "Master Key" },
    { key: "privateKey", label: "Private Key" },
    { key: "publicKey", label: "Public Key" },
    { key: "token", label: "Token" },
  ],
  FLUTTERWAVE: [
    { key: "secretKey", label: "Secret Key" },
    { key: "encryptionKey", label: "Encryption Key" },
  ],
};

export function ConfigurationsPrestataires() {
  const [configs, setConfigs] = useState<Config[]>([]);
  const [chargement, setChargement] = useState(true);
  const [ouvert, setOuvert] = useState(false);
  const [prestataire, setPrestataire] = useState<Prestataire>("CAMPAY");
  const [nom, setNom] = useState("");
  const [identifiants, setIdentifiants] = useState<Record<string, string>>({});
  const [parDefaut, setParDefaut] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  async function charger() {
    setChargement(true);
    const res = await fetch("/api/admin/prestataires");
    if (res.ok) {
      const data = await res.json();
      setConfigs(data.configs);
    }
    setChargement(false);
  }

  useEffect(() => {
    charger();
  }, []);

  async function creer(e: React.FormEvent) {
    e.preventDefault();
    setEnvoi(true);
    setErreur(null);
    const res = await fetch("/api/admin/prestataires", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prestataire, nom, identifiants, parDefaut }),
    });
    setEnvoi(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErreur(data.error ?? "Echec de la creation");
      return;
    }
    setOuvert(false);
    setNom("");
    setIdentifiants({});
    setParDefaut(false);
    charger();
  }

  async function tester(id: string) {
    const res = await fetch(`/api/admin/prestataires/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tester: true }),
    });
    const data = await res.json();
    alert(data.ok ? "Connexion reussie" : "Echec de la connexion");
    charger();
  }

  async function definirParDefaut(id: string) {
    await fetch(`/api/admin/prestataires/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parDefaut: true }),
    });
    charger();
  }

  async function supprimer(id: string) {
    if (!confirm("Supprimer cette configuration ?")) return;
    await fetch(`/api/admin/prestataires/${id}`, { method: "DELETE" });
    charger();
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[23px] font-extrabold tracking-tight">Prestataires de paiement</h1>
          <p className="text-[13.5px] text-kola-muted">Connecte au moins un prestataire pour pouvoir vendre une offre.</p>
        </div>
        <Button onClick={() => setOuvert((o) => !o)}>{ouvert ? "Annuler" : "Ajouter un prestataire"}</Button>
      </div>

      {ouvert && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nouvelle configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={creer} className="flex flex-col gap-4">
              <div>
                <Label className="mb-1.5 block">Prestataire</Label>
                <Select value={prestataire} onValueChange={(v) => { setPrestataire(v as Prestataire); setIdentifiants({}); }}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CAMPAY">Campay</SelectItem>
                    <SelectItem value="MESOMB">MeSomb</SelectItem>
                    <SelectItem value="PAYDUNYA">PayDunya</SelectItem>
                    <SelectItem value="FLUTTERWAVE">Flutterwave</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block">Nom (libre)</Label>
                <Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex : Campay production" required />
              </div>
              {CHAMPS[prestataire].map((champ) => (
                <div key={champ.key}>
                  <Label className="mb-1.5 block">{champ.label}</Label>
                  <Input
                    value={identifiants[champ.key] ?? ""}
                    onChange={(e) => setIdentifiants((prev) => ({ ...prev, [champ.key]: e.target.value }))}
                    required={!champ.label.includes("optionnel")}
                  />
                </div>
              ))}
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={parDefaut} onChange={(e) => setParDefaut(e.target.checked)} />
                Definir comme prestataire par defaut du tenant
              </label>
              {erreur && <p className="text-sm text-red-600">{erreur}</p>}
              <Button type="submit" disabled={envoi}>
                {envoi ? "Creation..." : "Creer la configuration"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="overflow-hidden rounded-2xl border border-kola-border bg-white">
        <div className="grid grid-cols-[1fr_1fr_0.6fr_0.6fr_1.2fr] gap-3 border-b border-kola-border bg-[#faf7ef] px-4.5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#8b8474]">
          <div>Nom</div>
          <div>Prestataire</div>
          <div>Statut</div>
          <div>Defaut</div>
          <div className="text-right">Actions</div>
        </div>
        {!chargement && configs.length === 0 && (
          <div className="px-4.5 py-6 text-sm text-kola-muted">Aucun prestataire connecte pour l&apos;instant.</div>
        )}
        {chargement &&
          [0, 1].map((i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_0.6fr_0.6fr_1.2fr] items-center gap-3 border-b border-[#f4efe4] px-4.5 py-3 last:border-b-0">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-4 w-10" />
              <div className="flex justify-end gap-2">
                <Skeleton className="h-8 w-16 rounded-md" />
                <Skeleton className="h-8 w-16 rounded-md" />
              </div>
            </div>
          ))}
        {configs.map((c) => (
          <div
            key={c.id}
            className="grid grid-cols-[1fr_1fr_0.6fr_0.6fr_1.2fr] items-center gap-3 border-b border-[#f4efe4] px-4.5 py-3 last:border-b-0"
          >
            <div className="font-semibold">{c.nom}</div>
            <div className="text-sm text-kola-muted">{c.prestataire}</div>
            <div>
              <Badge variant={c.actif ? "default" : "secondary"}>{c.actif ? "Actif" : "Inactif"}</Badge>
            </div>
            <div>{c.parDefaut && <Badge variant="outline">Defaut</Badge>}</div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => tester(c.id)}>
                Tester
              </Button>
              {!c.parDefaut && (
                <Button size="sm" variant="outline" onClick={() => definirParDefaut(c.id)}>
                  Definir par defaut
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => supprimer(c.id)}>
                Supprimer
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
