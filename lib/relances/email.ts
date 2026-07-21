// Canal email, optionnel (§8.1). Provider transactionnel via RESEND_API_KEY.
import type { CanalEnvoi, ResultatEnvoi } from "./types";

export const email: CanalEnvoi = {
  async envoyer(destinataire: string, message: string): Promise<ResultatEnvoi> {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return { ok: false, erreur: "Resend non configure (RESEND_API_KEY)" };

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          from: process.env.RESEND_FROM ?? "Kola <relances@kola.app>",
          to: destinataire,
          subject: "Ton abonnement Kola",
          text: message,
        }),
      });
      if (!res.ok) return { ok: false, erreur: `Resend ${res.status}` };
      return { ok: true };
    } catch (e) {
      return { ok: false, erreur: e instanceof Error ? e.message : "erreur inconnue" };
    }
  },
};
