// Client Campay (Mobile Money, sandbox demo.campay.net puis production).
// Reference API : https://documenter.getpostman.com/view/2391374/T1LV8PVA

export type CampayConfig = {
  appUsername: string;
  appPassword: string;
  baseUrl?: string;
};

type CampayTokenResponse = { token: string };

type CampayCollectResponse = {
  reference: string;
  status?: string;
};

type CampayTransactionStatusResponse = {
  reference: string;
  status: "PENDING" | "SUCCESSFUL" | "FAILED";
};

function resolveBaseUrl(config: CampayConfig): string {
  return config.baseUrl ?? process.env.CAMPAY_BASE_URL ?? "https://demo.campay.net";
}

async function getToken(config: CampayConfig): Promise<string> {
  const res = await fetch(`${resolveBaseUrl(config)}/api/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: config.appUsername, password: config.appPassword }),
  });
  if (!res.ok) {
    throw new Error(`Campay auth echouee (${res.status})`);
  }
  const data = (await res.json()) as CampayTokenResponse;
  return data.token;
}

export async function initierPaiement(
  config: CampayConfig,
  params: { montant: number; devise: string; telephone: string; description: string; referenceExterne: string }
): Promise<{ reference: string; statut: string }> {
  const token = await getToken(config);
  const res = await fetch(`${resolveBaseUrl(config)}/api/collect/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      amount: String(params.montant),
      currency: params.devise,
      from: params.telephone,
      description: params.description,
      external_reference: params.referenceExterne,
    }),
  });
  if (!res.ok) {
    throw new Error(`Campay collect echoue (${res.status})`);
  }
  const data = (await res.json()) as CampayCollectResponse;
  return { reference: data.reference, statut: data.status ?? "PENDING" };
}

export async function verifierTransaction(
  config: CampayConfig,
  reference: string
): Promise<{ statut: "PENDING" | "SUCCESSFUL" | "FAILED" }> {
  const token = await getToken(config);
  const res = await fetch(`${resolveBaseUrl(config)}/api/transaction/${reference}/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Campay statut transaction echoue (${res.status})`);
  }
  const data = (await res.json()) as CampayTransactionStatusResponse;
  return { statut: data.status };
}

// Mecanisme exact (header + secret) a confirmer dans le dashboard du compte sandbox Campay.
export function verifierSignatureWebhook(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.CAMPAY_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) return false;
  return signatureHeader === secret;
}
