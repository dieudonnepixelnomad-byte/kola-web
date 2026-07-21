"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Abonnement = { statut: string; dateEcheance: string | null; lienPaiement: string; offreNom: string; prix: number };

const STYLE: Record<string, "default" | "secondary" | "destructive"> = {
  ACTIF: "default",
  TOLERANCE: "secondary",
  COUPE: "destructive",
  EXPIRE: "destructive",
};

export function FacturationPage() {
  const [abonnement, setAbonnement] = useState<Abonnement | null>(null);

  useEffect(() => {
    fetch("/api/admin/facturation")
      .then((r) => r.json())
      .then((data) => setAbonnement(data.abonnement));
  }, []);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[23px] font-extrabold tracking-tight">Facturation</h1>
        <p className="text-[13.5px] text-kola-muted">Ton abonnement à Kola — géré par Kola, comme n&apos;importe quel abonné.</p>
      </div>

      {abonnement ? (
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              {abonnement.offreNom}
              <Badge variant={STYLE[abonnement.statut] ?? "secondary"}>{abonnement.statut}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm text-kola-muted">
            <div>{abonnement.prix === 0 ? "Gratuit" : `${abonnement.prix.toLocaleString("fr-FR")} FCFA / mois`}</div>
            {abonnement.dateEcheance && (
              <div>Prochaine échéance : {new Date(abonnement.dateEcheance).toLocaleDateString("fr-FR")}</div>
            )}
            <Button asChild className="w-fit">
              <a href={`/pay/${abonnement.lienPaiement}`}>Payer maintenant</a>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm text-kola-muted">Chargement...</p>
      )}
    </div>
  );
}
