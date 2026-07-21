// Adaptateur Flutterwave (Mobile Money franco, multi-pays). Implementation
// best-effort contre la documentation publique (https://developer.flutterwave.com)
// -- a valider contre un compte sandbox reel avant mise en production (§6.4).
import { createHash } from "crypto";
import type { IdentifiantsFlutterwave, PrestatairePaiement, RequeteWebhook } from "./types";

type FlutterwaveChargeResponse = { status: string; data?: { id: number; status: string } };
type FlutterwaveStatusResponse = { status: string; data?: { status: string } };

export class FlutterwaveAdapter implements PrestatairePaiement {
  readonly type = "FLUTTERWAVE" as const;

  constructor(private readonly identifiants: IdentifiantsFlutterwave) {}

  private baseUrl(): string {
    return process.env.FLUTTERWAVE_BASE_URL ?? "https://api.flutterwave.com/v3";
  }

  async initier(params: {
    montant: number;
    devise: string;
    telephone: string;
    description: string;
    referenceInterne: string;
  }) {
    const res = await fetch(`${this.baseUrl()}/charges?type=mobile_money_franco`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.identifiants.secretKey}`,
      },
      body: JSON.stringify({
        tx_ref: params.referenceInterne,
        amount: params.montant,
        currency: params.devise,
        phone_number: params.telephone,
        narration: params.description,
      }),
    });
    if (!res.ok) throw new Error(`Flutterwave charge echouee (${res.status})`);
    const data = (await res.json()) as FlutterwaveChargeResponse;
    return {
      providerTransactionId: String(data.data?.id ?? ""),
      statut: data.data?.status === "successful" ? ("SUCCESSFUL" as const) : ("PENDING" as const),
    };
  }

  async verifier(providerTransactionId: string) {
    const res = await fetch(`${this.baseUrl()}/transactions/${providerTransactionId}/verify`, {
      headers: { Authorization: `Bearer ${this.identifiants.secretKey}` },
    });
    if (!res.ok) throw new Error(`Flutterwave verif transaction echouee (${res.status})`);
    const data = (await res.json()) as FlutterwaveStatusResponse;
    const statut = data.data?.status === "successful" ? "SUCCESSFUL" : data.data?.status === "failed" ? "FAILED" : "PENDING";
    return { statut } as const;
  }

  verifierWebhook(req: RequeteWebhook): boolean {
    const hash = req.headers.get("verif-hash");
    if (!hash) return false;
    // Flutterwave attend en general le hash configure tel quel (pas un HMAC
    // du corps) ; on compare aussi un digest SHA-256 par prudence.
    const digest = createHash("sha256").update(this.identifiants.encryptionKey).digest("hex");
    return hash === this.identifiants.encryptionKey || hash === digest;
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
    const providerTransactionId = data.id != null ? String(data.id) : null;
    const referenceInterne = typeof data.tx_ref === "string" ? data.tx_ref : null;
    const statutBrut = typeof data.status === "string" ? data.status : "pending";
    const statut = statutBrut === "successful" ? "SUCCESSFUL" : statutBrut === "failed" ? "FAILED" : "PENDING";
    return { referenceInterne, providerTransactionId, statut } as const;
  }

  async tester(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl()}/balances`, {
        headers: { Authorization: `Bearer ${this.identifiants.secretKey}` },
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}
