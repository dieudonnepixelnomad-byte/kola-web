import jwt from "jsonwebtoken";

function normalizeKey(raw: string | undefined): string {
  if (!raw) throw new Error("Cle JWT manquante");
  return raw.replace(/\\n/g, "\n");
}

export type StatusTokenPayload = {
  identifiantExterne: string;
  offreSlug: string;
  tenantId: string;
  actif: boolean;
  dateEcheance: string | null;
};

export function signerToken(payload: StatusTokenPayload): string {
  const privateKey = normalizeKey(process.env.JWT_PRIVATE_KEY);
  return jwt.sign(payload, privateKey, { algorithm: "RS256", expiresIn: "72h" });
}

export function verifierToken(token: string): (StatusTokenPayload & jwt.JwtPayload) | null {
  const publicKey = normalizeKey(process.env.JWT_PUBLIC_KEY);
  try {
    return jwt.verify(token, publicKey, { algorithms: ["RS256"] }) as StatusTokenPayload & jwt.JwtPayload;
  } catch {
    return null;
  }
}
