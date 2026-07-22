"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type Modele = { id: string; type: string; canal: string; contenu: string; actif: boolean };
type Log = {
  id: string;
  type: string;
  canal: string;
  statutEnvoi: string;
  envoyeLe: string;
  erreur: string | null;
  abonnement: { abonne: { identifiantExterne: string }; offre: { nom: string } };
};

const LABELS_TYPE: Record<string, string> = { J_MOINS_3: "J-3", J_ECHEANCE: "Jour J", J_PLUS_7: "J+7" };

export function RelancesPage() {
  const [modeles, setModeles] = useState<Modele[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [statsEnvoyes, setStatsEnvoyes] = useState(0);
  const [statsTotal, setStatsTotal] = useState(0);
  const [chargement, setChargement] = useState(true);

  async function charger() {
    const [resModeles, resLogs] = await Promise.all([fetch("/api/admin/relances/modeles"), fetch("/api/admin/relances")]);
    if (resModeles.ok) setModeles((await resModeles.json()).modeles);
    if (resLogs.ok) {
      const data = await resLogs.json();
      setLogs(data.logs);
      setStatsEnvoyes(data.envoyes);
      setStatsTotal(data.total);
    }
    setChargement(false);
  }

  useEffect(() => {
    charger();
  }, []);

  async function sauvegarder(modele: Modele) {
    await fetch("/api/admin/relances/modeles", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: modele.type, canal: modele.canal, contenu: modele.contenu, actif: modele.actif }),
    });
    charger();
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[23px] font-extrabold tracking-tight">Relances</h1>
        <p className="text-[13.5px] text-kola-muted">
          {statsTotal > 0 ? `${statsEnvoyes}/${statsTotal} relances envoyées avec succès` : "Aucune relance envoyée pour l'instant"}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {chargement &&
          [0, 1, 2].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        {modeles.map((m) => (
          <Card key={m.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-sm">
                <span>
                  {LABELS_TYPE[m.type] ?? m.type} · {m.canal}
                </span>
                <Switch checked={m.actif} onCheckedChange={(v) => sauvegarder({ ...m, actif: v })} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                defaultValue={m.contenu}
                rows={4}
                onBlur={(e) => sauvegarder({ ...m, contenu: e.target.value })}
                className="text-sm"
              />
              <p className="mt-1.5 text-[11px] text-kola-muted-light">Variables : {"{nom} {offre} {prix} {jours} {lien}"}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-kola-border bg-white">
        <div className="grid grid-cols-[1fr_0.6fr_0.6fr_0.6fr_1fr] gap-3 border-b border-kola-border bg-[#faf7ef] px-4.5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#8b8474]">
          <div>Abonné</div>
          <div>Type</div>
          <div>Canal</div>
          <div>Statut</div>
          <div>Date</div>
        </div>
        {!chargement && logs.length === 0 && <div className="px-4.5 py-6 text-sm text-kola-muted">Journal vide.</div>}
        {chargement &&
          [0, 1, 2].map((i) => (
            <div key={i} className="grid grid-cols-[1fr_0.6fr_0.6fr_0.6fr_1fr] items-center gap-3 border-b border-[#f4efe4] px-4.5 py-3 last:border-b-0">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-10" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        {logs.map((l) => (
          <div key={l.id} className="grid grid-cols-[1fr_0.6fr_0.6fr_0.6fr_1fr] items-center gap-3 border-b border-[#f4efe4] px-4.5 py-3 last:border-b-0">
            <div className="font-mono text-sm">{l.abonnement.abonne.identifiantExterne}</div>
            <div className="text-sm text-kola-muted">{LABELS_TYPE[l.type] ?? l.type}</div>
            <div className="text-sm text-kola-muted">{l.canal}</div>
            <div>
              <Badge variant={l.statutEnvoi === "ENVOYE" ? "default" : "secondary"}>{l.statutEnvoi}</Badge>
            </div>
            <div className="text-sm text-kola-muted">{new Date(l.envoyeLe).toLocaleString("fr-FR")}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
