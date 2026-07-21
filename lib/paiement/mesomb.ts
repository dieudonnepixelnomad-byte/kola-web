// Adaptateur MeSomb (Mobile Money). Implementation best-effort contre la
// documentation publique (https://mesomb.hachther.com/) -- a valider contre
// un compte sandbox reel avant mise en production (cf. §6.4).
import { createHmac, randomUUID } from "crypto";
import type { IdentifiantsMesomb, PrestatairePaiement, RequeteWebhook } from "./types";

type MesombCollectResponse = { success: boolean; transaction?: { pk: string; status: string } };
type MesombStatusResponse = { status: "PENDING" | "SUCCESS" | "FAILED" };

export class MesombAdapter implements PrestatairePaiement {
  readonly type = "MESOMB" as const;

  constructor(private readonly identifiants: IdentifiantsMesomb) {}

  private baseUrl(): string {
    return process.env.MESOMB_BASE_URL ?? "https://mesomb.hachther.com";
  }

  private signature(method: string, endpoint: string, nonce: string, date: string): string {
    const chaine = `${method}&${endpoint}&${nonce}&${date}`;
    return createHmac("sha1", this.identifiants.secretKey).update(chaine).digest("hex");
  }

  async initier(params: {
    montant: number;
    devise: string;
    telephone: string;
    description: string;
    referenceInterne: string;
  }) {
    const endpoint = `/en/api/v1.1/payment/collect/`;
    const nonce = randomUUID();
    const date = new Date().toISOString();
    const res = await fetch(`${this.baseUrl()}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-MeSomb-Application": this.identifiants.applicationKey,
        "X-MeSomb-Nonce": nonce,
        Authorization: `HMAC-SHA1 Credential=${this.identifiants.accessKey}, SignedHeaders=, Signature=${this.signature("POST", endpoint, nonce, date)}`,
      },
      body: JSON.stringify({
        amount: params.montant,
        currency: params.devise,
        payer: params.telephone,
        externalId: params.referenceInterne,
        description: params.description,
      }),
    });
    if (!res.ok) throw new Error(`MeSomb collect echoue (${res.status})`);
    const data = (await res.json()) as MesombCollectResponse;
    return {
      providerTransactionId: data.transaction?.pk ?? "",
      statut: data.success ? ("SUCCESSFUL" as const) : ("PENDING" as const),
    };
  }

  async verifier(providerTransactionId: string) {
    const res = await fetch(`${this.baseUrl()}/en/api/v1.1/transactions/?ids=${providerTransactionId}`, {
      headers: { "X-MeSomb-Application": this.identifiants.applicationKey },
    });
    if (!res.ok) throw new Error(`MeSomb statut transaction echoue (${res.status})`);
    const data = (await res.json()) as MesombStatusResponse;
    const statut = data.status === "SUCCESS" ? "SUCCESSFUL" : data.status === "FAILED" ? "FAILED" : "PENDING";
    return { statut } as const;
  }

  verifierWebhook(req: RequeteWebhook): boolean {
    const signature = req.headers.get("x-mesomb-signature");
    if (!signature) return false;
    const attendu = createHmac("sha1", this.identifiants.secretKey).update(req.corpsBrut).digest("hex");
    return signature === attendu;
  }

  parserWebhook(req: RequeteWebhook) {
    let payload: unknown;
    try {
      payload = JSON.parse(req.corpsBrut);
    } catch {
      return { referenceInterne: null, providerTransactionId: null, statut: "FAILED" as const };
    }
    const obj = typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};
    const providerTransactionId = typeof obj.pk === "string" ? obj.pk : null;
    const referenceInterne = typeof obj.externalId === "string" ? obj.externalId : null;
    const statutBrut = typeof obj.status === "string" ? obj.status : "PENDING";
    const statut = statutBrut === "SUCCESS" ? "SUCCESSFUL" : statutBrut === "FAILED" ? "FAILED" : "PENDING";
    return { referenceInterne, providerTransactionId, statut } as const;
  }

  async tester(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl()}/en/api/v1.1/application/${this.identifiants.applicationKey}/`, {
        headers: { "X-MeSomb-Application": this.identifiants.applicationKey },
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}
