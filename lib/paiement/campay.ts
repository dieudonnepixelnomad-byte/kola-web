// Adaptateur Campay (Mobile Money, sandbox demo.campay.net puis production).
// Reference API : https://documenter.getpostman.com/view/2391374/T1LV8PVA
import type { IdentifiantsCampay, PrestatairePaiement, RequeteWebhook } from "./types";

type CampayTokenResponse = { token: string };
type CampayCollectResponse = { reference: string; status?: string };
type CampayTransactionStatusResponse = { reference: string; status: "PENDING" | "SUCCESSFUL" | "FAILED" };

export class CampayAdapter implements PrestatairePaiement {
  readonly type = "CAMPAY" as const;

  constructor(private readonly identifiants: IdentifiantsCampay & { webhookSecret?: string }) {}

  private baseUrl(): string {
    return process.env.CAMPAY_BASE_URL ?? "https://demo.campay.net";
  }

  private async getToken(): Promise<string> {
    const res = await fetch(`${this.baseUrl()}/api/token/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: this.identifiants.appUsername,
        password: this.identifiants.appPassword,
      }),
    });
    if (!res.ok) throw new Error(`Campay auth echouee (${res.status})`);
    const data = (await res.json()) as CampayTokenResponse;
    return data.token;
  }

  async initier(params: {
    montant: number;
    devise: string;
    telephone: string;
    description: string;
    referenceInterne: string;
  }) {
    const token = await this.getToken();
    const res = await fetch(`${this.baseUrl()}/api/collect/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        amount: String(params.montant),
        currency: params.devise,
        from: params.telephone,
        description: params.description,
        external_reference: params.referenceInterne,
      }),
    });
    if (!res.ok) throw new Error(`Campay collect echoue (${res.status})`);
    const data = (await res.json()) as CampayCollectResponse;
    return {
      providerTransactionId: data.reference,
      statut: (data.status as "PENDING" | "SUCCESSFUL" | "FAILED") ?? "PENDING",
    };
  }

  async verifier(providerTransactionId: string) {
    const token = await this.getToken();
    const res = await fetch(`${this.baseUrl()}/api/transaction/${providerTransactionId}/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Campay statut transaction echoue (${res.status})`);
    const data = (await res.json()) as CampayTransactionStatusResponse;
    return { statut: data.status };
  }

  // Mecanisme exact (header + secret) a confirmer dans le dashboard du
  // compte Campay -- placeholder d'egalite stricte, cf. lib/campay.ts historique.
  verifierWebhook(req: RequeteWebhook): boolean {
    const secret = this.identifiants.webhookSecret ?? this.identifiants.appPassword;
    const signature = req.headers.get("x-campay-signature");
    if (!secret || !signature) return false;
    return signature === secret;
  }

  parserWebhook(req: RequeteWebhook) {
    let payload: unknown;
    try {
      payload = JSON.parse(req.corpsBrut);
    } catch {
      return { referenceInterne: null, providerTransactionId: null, statut: "FAILED" as const };
    }
    const obj = typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};
    const providerTransactionId = typeof obj.reference === "string" ? obj.reference : null;
    const referenceInterne = typeof obj.external_reference === "string" ? obj.external_reference : null;
    const statutBrut = typeof obj.status === "string" ? obj.status : "PENDING";
    const statut = statutBrut === "SUCCESSFUL" ? "SUCCESSFUL" : statutBrut === "FAILED" ? "FAILED" : "PENDING";
    return { referenceInterne, providerTransactionId, statut } as const;
  }

  async tester(): Promise<boolean> {
    try {
      await this.getToken();
      return true;
    } catch {
      return false;
    }
  }
}
