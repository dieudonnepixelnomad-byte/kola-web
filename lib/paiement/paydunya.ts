// Adaptateur PayDunya. Implementation best-effort contre la documentation
// publique (https://paydunya.com/developers) -- a valider contre un compte
// sandbox reel avant mise en production (cf. §6.4). Modele "invoice" mappe
// sur notre Transaction.
import type { IdentifiantsPaydunya, PrestatairePaiement, RequeteWebhook } from "./types";

type PaydunyaInvoiceResponse = { response_code: string; token?: string };
type PaydunyaStatusResponse = { status: "pending" | "completed" | "cancelled" };

export class PaydunyaAdapter implements PrestatairePaiement {
  readonly type = "PAYDUNYA" as const;

  constructor(private readonly identifiants: IdentifiantsPaydunya) {}

  private baseUrl(): string {
    return process.env.PAYDUNYA_BASE_URL ?? "https://app.paydunya.com/sandbox-api/v1";
  }

  private headers(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      "PAYDUNYA-MASTER-KEY": this.identifiants.masterKey,
      "PAYDUNYA-PRIVATE-KEY": this.identifiants.privateKey,
      "PAYDUNYA-PUBLIC-KEY": this.identifiants.publicKey,
      "PAYDUNYA-TOKEN": this.identifiants.token,
    };
  }

  async initier(params: {
    montant: number;
    devise: string;
    telephone: string;
    description: string;
    referenceInterne: string;
  }) {
    const res = await fetch(`${this.baseUrl()}/checkout-invoice/create`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        invoice: { total_amount: params.montant, description: params.description },
        store: { name: "Kola" },
        custom_data: { referenceInterne: params.referenceInterne },
      }),
    });
    if (!res.ok) throw new Error(`PayDunya invoice echouee (${res.status})`);
    const data = (await res.json()) as PaydunyaInvoiceResponse;
    if (data.response_code !== "00" || !data.token) throw new Error("PayDunya invoice refusee");
    return { providerTransactionId: data.token, statut: "PENDING" as const };
  }

  async verifier(providerTransactionId: string) {
    const res = await fetch(`${this.baseUrl()}/checkout-invoice/confirm/${providerTransactionId}`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error(`PayDunya statut invoice echoue (${res.status})`);
    const data = (await res.json()) as PaydunyaStatusResponse;
    const statut = data.status === "completed" ? "SUCCESSFUL" : data.status === "cancelled" ? "FAILED" : "PENDING";
    return { statut } as const;
  }

  verifierWebhook(req: RequeteWebhook): boolean {
    // PayDunya signe via les memes headers PAYDUNYA-* que les appels sortants ;
    // verification par re-emission de la master key recue en IPN (cf. doc).
    const masterKey = req.headers.get("paydunya-master-key");
    return masterKey === this.identifiants.masterKey;
  }

  parserWebhook(req: RequeteWebhook) {
    let payload: unknown;
    try {
      payload = JSON.parse(req.corpsBrut);
    } catch {
      return { referenceInterne: null, providerTransactionId: null, statut: "FAILED" as const };
    }
    const obj = typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};
    const data = typeof obj.data === "object" && obj.data !== null ? (obj.data as Record<string, unknown>) : obj;
    const providerTransactionId = typeof data.invoice_token === "string" ? data.invoice_token : null;
    const customData =
      typeof data.custom_data === "object" && data.custom_data !== null
        ? (data.custom_data as Record<string, unknown>)
        : {};
    const referenceInterne = typeof customData.referenceInterne === "string" ? customData.referenceInterne : null;
    const statutBrut = typeof data.status === "string" ? data.status : "pending";
    const statut = statutBrut === "completed" ? "SUCCESSFUL" : statutBrut === "cancelled" ? "FAILED" : "PENDING";
    return { referenceInterne, providerTransactionId, statut } as const;
  }

  async tester(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl()}/checkout-invoice/create`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({ invoice: { total_amount: 100, description: "Test connexion Kola" } }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}
