// Canal WhatsApp Cloud API (Meta), canal par defaut (§8.1). Necessite
// WHATSAPP_TOKEN + WHATSAPP_PHONE_NUMBER_ID en env. Absent en dev -> echec
// propre, journalise sur LogRelance, jamais bloquant pour la state machine.
import type { CanalEnvoi, ResultatEnvoi } from "./types";

export const whatsapp: CanalEnvoi = {
  async envoyer(destinataire: string, message: string): Promise<ResultatEnvoi> {
    const token = process.env.WHATSAPP_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (!token || !phoneNumberId) {
      return { ok: false, erreur: "WhatsApp non configure (WHATSAPP_TOKEN/WHATSAPP_PHONE_NUMBER_ID)" };
    }

    try {
      const res = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: destinataire.replace(/^\+/, ""),
          type: "text",
          text: { body: message },
        }),
      });
      if (!res.ok) return { ok: false, erreur: `WhatsApp API ${res.status}` };
      return { ok: true };
    } catch (e) {
      return { ok: false, erreur: e instanceof Error ? e.message : "erreur inconnue" };
    }
  },
};
