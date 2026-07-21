// Canal SMS, fallback si pas de WhatsApp (§8.1). Passerelle generique par
// URL + cle API en env (SMS_GATEWAY_URL/SMS_GATEWAY_API_KEY) -- a adapter a
// l'agregateur reellement choisi.
import type { CanalEnvoi, ResultatEnvoi } from "./types";

export const sms: CanalEnvoi = {
  async envoyer(destinataire: string, message: string): Promise<ResultatEnvoi> {
    const url = process.env.SMS_GATEWAY_URL;
    const apiKey = process.env.SMS_GATEWAY_API_KEY;
    if (!url || !apiKey) {
      return { ok: false, erreur: "Passerelle SMS non configuree (SMS_GATEWAY_URL/SMS_GATEWAY_API_KEY)" };
    }

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ to: destinataire, message }),
      });
      if (!res.ok) return { ok: false, erreur: `SMS gateway ${res.status}` };
      return { ok: true };
    } catch (e) {
      return { ok: false, erreur: e instanceof Error ? e.message : "erreur inconnue" };
    }
  },
};
